// Send recruitment outreach to verified prospects via Resend (separate domain).
// Two entry points share one eligibility gate + send routine:
//   • sendPendingOutreach()      — global batch (admin "run outreach" button).
//   • sendAreaOutreach({lat,lng}) — area-scoped, fired when a new job lands in an
//     uncovered area, to (re-)nudge the prospects we found there.
// A prospect is re-emailed once per new job in their area until they sign up,
// capped at MAX_OUTREACH_EMAILS and throttled by OUTREACH_FOLLOWUP_COOLDOWN_HOURS.
// The hard gates here are the compliance backbone — we never email an unverified,
// opted-out, converted, or over-cap address.

import { and, asc, count, eq, gte, inArray, isNotNull, isNull, lt, ne, notInArray, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorProspects, emailOptOuts, leads, outreachSends } from '@/lib/db/schema'
import { isEmailOptedOut } from '@/lib/notifications/opt-out'
import { mintInviteToken, mintUnsubscribeToken } from '@/lib/recruitment/invite'
import {
  sendRecruitmentEmail,
  recruitmentEmailConfigured,
  appUrl,
} from '@/lib/notifications/recruitment-email'
import {
  MIN_EMAIL_CONFIDENCE,
  OUTREACH_EXPORT_BATCH,
  MAX_OUTREACH_EMAILS,
  OUTREACH_FOLLOWUP_COOLDOWN_HOURS,
  OUTREACH_AREA_RADIUS_METERS,
  INVITE_MAX_EMAILS,
  INVITE_FOLLOWUP_DAYS,
} from '@/lib/config/recruitment'
import {
  streamDailyCap,
  GUARDRAILS,
  type OutreachStream,
} from '@/lib/recruitment/send-policy'

const GUARDRAIL_MIN_SAMPLE = 50 // don't auto-throttle on tiny samples (early noise)

/** Emails sent so far today ON THIS STREAM's domain. Exact per-send count from
 *  the ledger — the prospect's last_outreach_at is a single timestamp and can't
 *  count two sends in a day or attribute a send to a stream. */
async function sentToday(stream: OutreachStream): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(outreachSends)
    .where(and(eq(outreachSends.stream, stream), gte(outreachSends.sentAt, sql`date_trunc('day', now())`)))
  return r?.n ?? 0
}

/**
 * Deliverability auto-throttle: once we've sent a meaningful sample, pause all
 * outreach if bounce or complaint rates breach the guardrails (Gmail/Yahoo
 * bulk-sender danger zone). Rates come from the Resend webhook → email_opt_outs.
 */
async function guardrailStatus(stream: OutreachStream): Promise<{ ok: boolean; reason?: string }> {
  // Sample + rates are PER STREAM/domain: an invite-domain complaint spike must
  // never pause the money-making lead domain. Sent sample = ledger rows for the
  // stream; bounces/complaints = opt-outs the Resend webhook attributed to it.
  const [agg] = await db
    .select({ n: count() })
    .from(outreachSends)
    .where(eq(outreachSends.stream, stream))
  const sent = agg?.n ?? 0
  if (sent < GUARDRAIL_MIN_SAMPLE) return { ok: true }

  const [b] = await db
    .select({ n: count() })
    .from(emailOptOuts)
    .where(and(eq(emailOptOuts.source, 'bounce'), eq(emailOptOuts.stream, stream)))
  const [c] = await db
    .select({ n: count() })
    .from(emailOptOuts)
    .where(and(eq(emailOptOuts.source, 'complaint'), eq(emailOptOuts.stream, stream)))
  const bounceRate = (b?.n ?? 0) / sent
  const complaintRate = (c?.n ?? 0) / sent
  if (bounceRate > GUARDRAILS.maxBounceRate) {
    return { ok: false, reason: `bounce rate ${(bounceRate * 100).toFixed(1)}% over ${GUARDRAILS.maxBounceRate * 100}%` }
  }
  if (complaintRate > GUARDRAILS.maxComplaintRate) {
    return { ok: false, reason: `complaint rate ${(complaintRate * 100).toFixed(2)}% over ${GUARDRAILS.maxComplaintRate * 100}%` }
  }
  return { ok: true }
}

export type SendResult = { ok: boolean; selected: number; sent: number; reason?: string }

type Candidate = {
  id: string
  email: string | null
  companyName: string | null
  city: string | null
  rating: string | null
  outreachCount: number
}

const CANDIDATE_COLUMNS = {
  id: contractorProspects.id,
  email: contractorProspects.email,
  companyName: contractorProspects.companyName,
  city: contractorProspects.city,
  rating: contractorProspects.rating,
  outreachCount: contractorProspects.outreachCount,
}

/**
 * Eligibility shared by every send path. A prospect can be emailed when they:
 * haven't signed up (no conversion), aren't suppressed/bounced/skipped, have a
 * verified email above the confidence floor, are under the lifetime cap, and
 * their last email is older than the cooldown (or they've never been emailed).
 *
 * The cap + cooldown are per-stream: lead nudges re-hit on every new real job
 * (cap 4, no cooldown); cold invites are gentler (cap 2, ~4-day cooldown).
 */
function eligibilityFilters(
  {
    maxEmails = MAX_OUTREACH_EMAILS,
    cooldownHours = OUTREACH_FOLLOWUP_COOLDOWN_HOURS,
    firstTouchOnly = false,
  } = {},
) {
  const cooldownCutoff = new Date(Date.now() - cooldownHours * 3600 * 1000)
  return and(
    // "until they sign up" — a converted prospect is never emailed again.
    isNull(contractorProspects.convertedToContractorId),
    notInArray(contractorProspects.outreachStatus, ['suppressed', 'bounced', 'skipped', 'converted']),
    inArray(contractorProspects.enrichmentStatus, ['email_found', 'email_verified']),
    isNotNull(contractorProspects.email),
    gte(contractorProspects.emailConfidence, MIN_EMAIL_CONFIDENCE),
    // lifetime cap on touches.
    lt(contractorProspects.outreachCount, maxEmails),
    // Catch-up path only: roofers we've NEVER emailed, so a stubbornly-uncovered
    // lead can't daily-spam the same shop and the honest first-touch copy is
    // always used (never a false "another homeowner just posted").
    firstTouchOnly ? eq(contractorProspects.outreachCount, 0) : undefined,
    // cooldown: never emailed, or last email older than the throttle window.
    or(
      isNull(contractorProspects.lastOutreachAt),
      lt(contractorProspects.lastOutreachAt, cooldownCutoff),
    ),
  )
}

/**
 * Send one prospect their (next) recruitment email and advance its counters.
 * Returns 'sent' on success, 'suppressed' when opted out (and marks it so), or
 * 'fatal' on a config error the caller should stop the whole run for.
 */
async function sendToProspect(
  c: Candidate,
  stream: OutreachStream,
): Promise<'sent' | 'suppressed' | 'skipped' | 'fatal'> {
  if (!c.email) return 'skipped'
  if (await isEmailOptedOut(c.email)) {
    await db
      .update(contractorProspects)
      .set({ outreachStatus: 'suppressed', updatedAt: new Date() })
      .where(eq(contractorProspects.id, c.id))
    return 'suppressed'
  }

  const inviteToken = mintInviteToken(c.id)
  const unsubToken = mintUnsubscribeToken(c.email)
  if (!inviteToken || !unsubToken) return 'fatal' // UNSUBSCRIBE_SECRET not set

  const res = await sendRecruitmentEmail({
    to: c.email,
    companyName: c.companyName,
    city: c.city,
    rating: c.rating,
    // Counter hasn't been incremented yet, so >0 means we've emailed before.
    isFollowUp: c.outreachCount > 0,
    claimUrl: `${appUrl()}/claim/${inviteToken}`,
    unsubscribeUrl: `${appUrl()}/unsubscribe/${unsubToken}`,
    stream,
  })
  if (!res.ok) {
    console.error('[outreach-sync] send failed', { id: c.id })
    return 'skipped' // leave it eligible → retried next run
  }

  await db
    .update(contractorProspects)
    .set({
      outreachStatus: 'sent',
      outreachCount: sql`${contractorProspects.outreachCount} + 1`,
      inviteToken,
      lastOutreachAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contractorProspects.id, c.id))
  // Ledger row: the exact per-stream/day counter behind per-domain caps, and the
  // resend_id the webhook uses to attribute a future bounce/complaint to this domain.
  await db.insert(outreachSends).values({ prospectId: c.id, stream, resendId: res.id ?? null })
  return 'sent'
}

/** Walk a candidate list, sending each, stopping early only on a fatal config error. */
async function runOutreachOver(candidates: Candidate[], stream: OutreachStream): Promise<SendResult> {
  let sent = 0
  for (const c of candidates) {
    const outcome = await sendToProspect(c, stream)
    if (outcome === 'fatal') {
      return { ok: false, selected: candidates.length, sent, reason: 'UNSUBSCRIBE_SECRET not set' }
    }
    if (outcome === 'sent') sent++
  }
  return { ok: true, selected: candidates.length, sent }
}

/**
 * Send the next global batch of INVITE emails (oldest prospects first). Invites
 * are the lower-priority stream: they're bounded by the invite daily ceiling
 * (a share of the cap) so they can never starve lead mails, and pause entirely
 * if the deliverability guardrails trip.
 */
export async function sendPendingOutreach(): Promise<SendResult> {
  if (!recruitmentEmailConfigured()) {
    return { ok: false, selected: 0, sent: 0, reason: 'recruitment email not configured' }
  }
  const guard = await guardrailStatus('invite')
  if (!guard.ok) return { ok: false, selected: 0, sent: 0, reason: `paused — ${guard.reason}` }

  const budget = Math.max(0, streamDailyCap('invite') - (await sentToday('invite')))
  if (budget === 0) return { ok: true, selected: 0, sent: 0, reason: 'daily invite budget reached' }

  const candidates = await db
    .select(CANDIDATE_COLUMNS)
    .from(contractorProspects)
    // Invites: gentler cap (2) + ~4-day cooldown before the single follow-up.
    .where(eligibilityFilters({ maxEmails: INVITE_MAX_EMAILS, cooldownHours: INVITE_FOLLOWUP_DAYS * 24 }))
    // Best reputation first — the daily cap goes to the most established roofers.
    // Tiebreak: first-timers ahead of follow-ups, then oldest found.
    .orderBy(
      sql`${contractorProspects.rating} desc nulls last`,
      sql`${contractorProspects.reviewCount} desc nulls last`,
      asc(contractorProspects.outreachCount),
      asc(contractorProspects.createdAt),
    )
    .limit(Math.min(OUTREACH_EXPORT_BATCH, budget))

  return runOutreachOver(candidates, 'invite')
}

/**
 * (Re-)nudge prospects within OUTREACH_AREA_RADIUS_METERS of a point — called when
 * a new job lands in an uncovered area. First-timers get their first email;
 * already-emailed prospects get a follow-up (subject to the cap + cooldown).
 */
export async function sendAreaOutreach(
  {
    serviceId,
    lat,
    lng,
    firstTouchOnly = false,
  }: { serviceId: string; lat: number; lng: number; firstTouchOnly?: boolean },
): Promise<SendResult> {
  if (!recruitmentEmailConfigured()) {
    return { ok: false, selected: 0, sent: 0, reason: 'recruitment email not configured' }
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, selected: 0, sent: 0, reason: 'no coordinates' }
  }
  // Lead mails run on their own domain's cap + guardrail (independent of invites).
  const guard = await guardrailStatus('lead')
  if (!guard.ok) return { ok: false, selected: 0, sent: 0, reason: `paused — ${guard.reason}` }

  const budget = Math.max(0, streamDailyCap('lead') - (await sentToday('lead')))
  if (budget === 0) return { ok: true, selected: 0, sent: 0, reason: 'daily cap reached' }

  const point = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`
  const prospectPoint = sql`ST_SetSRID(ST_MakePoint(${contractorProspects.lng}, ${contractorProspects.lat}), 4326)::geography`

  const candidates = await db
    .select(CANDIDATE_COLUMNS)
    .from(contractorProspects)
    .where(
      and(
        eq(contractorProspects.serviceId, serviceId),
        isNotNull(contractorProspects.lat),
        isNotNull(contractorProspects.lng),
        sql`ST_DWithin(${prospectPoint}, ${point}, ${OUTREACH_AREA_RADIUS_METERS})`,
        eligibilityFilters({ firstTouchOnly }),
      ),
    )
    // Fewest touches first, so we spread nudges before re-hitting the same shops.
    .orderBy(asc(contractorProspects.outreachCount), asc(contractorProspects.lastOutreachAt))
    .limit(Math.min(OUTREACH_EXPORT_BATCH, budget))

  return runOutreachOver(candidates, 'lead')
}

/**
 * Send ONE just-enriched prospect their lead email IF a homeowner is already
 * waiting nearby with no coverage. Closes the fresh-area timing gap: when a job
 * lands in a never-scraped area, sendAreaOutreach fires before enrichment has
 * found any emails, so it emails no one; minutes later enrichment finds the
 * email, but nothing re-sends. This runs at the moment enrichment completes —
 * if an open awaiting-coverage job sits within the area radius, the roofer gets
 * the job now instead of never. Reuses the same eligibility/cap/cooldown/opt-out/
 * guardrail/budget gates as every other send, so it can't double-send or spam.
 */
export async function sendProspectLeadIfAwaitingDemand(prospectId: string): Promise<SendResult> {
  if (!recruitmentEmailConfigured()) {
    return { ok: false, selected: 0, sent: 0, reason: 'recruitment email not configured' }
  }
  const guard = await guardrailStatus('lead')
  if (!guard.ok) return { ok: false, selected: 0, sent: 0, reason: `paused — ${guard.reason}` }

  const budget = Math.max(0, streamDailyCap('lead') - (await sentToday('lead')))
  if (budget === 0) return { ok: true, selected: 0, sent: 0, reason: 'daily cap reached' }

  const prospectPoint = sql`ST_SetSRID(ST_MakePoint(${contractorProspects.lng}, ${contractorProspects.lat}), 4326)::geography`

  // Eligible AND an open, still-uncovered job sits within the area radius.
  const [candidate] = await db
    .select(CANDIDATE_COLUMNS)
    .from(contractorProspects)
    .where(
      and(
        eq(contractorProspects.id, prospectId),
        isNotNull(contractorProspects.lat),
        isNotNull(contractorProspects.lng),
        eligibilityFilters(),
        sql`EXISTS (
          SELECT 1 FROM ${leads} l
          WHERE l.service_id = ${contractorProspects.serviceId}
            AND l.awaiting_coverage = true
            AND l.status = 'open'
            AND l.lat IS NOT NULL AND l.lng IS NOT NULL
            AND ST_DWithin(
              ST_SetSRID(ST_MakePoint(l.lng, l.lat), 4326)::geography,
              ${prospectPoint},
              ${OUTREACH_AREA_RADIUS_METERS}
            )
        )`,
      ),
    )
    .limit(1)

  if (!candidate) {
    return { ok: true, selected: 0, sent: 0, reason: 'no nearby awaiting-coverage demand or not eligible' }
  }
  return runOutreachOver([candidate], 'lead')
}

/** Skip prospects we'll never email (no findable email) — housekeeping. */
export async function markNoEmailSkipped(): Promise<number> {
  const rows = await db
    .update(contractorProspects)
    .set({ outreachStatus: 'skipped', updatedAt: new Date() })
    .where(
      and(
        eq(contractorProspects.enrichmentStatus, 'no_email'),
        ne(contractorProspects.outreachStatus, 'skipped'),
      ),
    )
    .returning({ id: contractorProspects.id })
  return rows.length
}
