// Send recruitment outreach to verified prospects via Resend (separate domain).
// Two entry points share one eligibility gate + send routine:
//   • sendPendingOutreach()      — global batch (admin "run outreach" button).
//   • sendAreaOutreach({lat,lng}) — area-scoped, fired when a new job lands in an
//     uncovered area, to (re-)nudge the prospects we found there.
// A prospect is re-emailed once per new job in their area until they sign up,
// capped at MAX_OUTREACH_EMAILS and throttled by OUTREACH_FOLLOWUP_COOLDOWN_HOURS.
// The hard gates here are the compliance backbone — we never email an unverified,
// opted-out, converted, or over-cap address.

import { and, asc, eq, gte, inArray, isNotNull, isNull, lt, ne, notInArray, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorProspects } from '@/lib/db/schema'
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
} from '@/lib/config/recruitment'

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
 */
function eligibilityFilters() {
  const cooldownCutoff = new Date(Date.now() - OUTREACH_FOLLOWUP_COOLDOWN_HOURS * 3600 * 1000)
  return and(
    // "until they sign up" — a converted prospect is never emailed again.
    isNull(contractorProspects.convertedToContractorId),
    notInArray(contractorProspects.outreachStatus, ['suppressed', 'bounced', 'skipped', 'converted']),
    inArray(contractorProspects.enrichmentStatus, ['email_found', 'email_verified']),
    isNotNull(contractorProspects.email),
    gte(contractorProspects.emailConfidence, MIN_EMAIL_CONFIDENCE),
    // lifetime cap on touches.
    lt(contractorProspects.outreachCount, MAX_OUTREACH_EMAILS),
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
async function sendToProspect(c: Candidate): Promise<'sent' | 'suppressed' | 'skipped' | 'fatal'> {
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
  return 'sent'
}

/** Walk a candidate list, sending each, stopping early only on a fatal config error. */
async function runOutreachOver(candidates: Candidate[]): Promise<SendResult> {
  let sent = 0
  for (const c of candidates) {
    const outcome = await sendToProspect(c)
    if (outcome === 'fatal') {
      return { ok: false, selected: candidates.length, sent, reason: 'UNSUBSCRIBE_SECRET not set' }
    }
    if (outcome === 'sent') sent++
  }
  return { ok: true, selected: candidates.length, sent }
}

/** Send the next global batch of recruitment emails (oldest prospects first). */
export async function sendPendingOutreach(): Promise<SendResult> {
  if (!recruitmentEmailConfigured()) {
    return { ok: false, selected: 0, sent: 0, reason: 'recruitment email not configured' }
  }

  const candidates = await db
    .select(CANDIDATE_COLUMNS)
    .from(contractorProspects)
    .where(eligibilityFilters())
    // Fewest touches first (first-timers ahead of follow-ups), then oldest found.
    .orderBy(asc(contractorProspects.outreachCount), asc(contractorProspects.createdAt))
    .limit(OUTREACH_EXPORT_BATCH)

  return runOutreachOver(candidates)
}

/**
 * (Re-)nudge prospects within OUTREACH_AREA_RADIUS_METERS of a point — called when
 * a new job lands in an uncovered area. First-timers get their first email;
 * already-emailed prospects get a follow-up (subject to the cap + cooldown).
 */
export async function sendAreaOutreach(
  { serviceId, lat, lng }: { serviceId: string; lat: number; lng: number },
): Promise<SendResult> {
  if (!recruitmentEmailConfigured()) {
    return { ok: false, selected: 0, sent: 0, reason: 'recruitment email not configured' }
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, selected: 0, sent: 0, reason: 'no coordinates' }
  }

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
        eligibilityFilters(),
      ),
    )
    // Fewest touches first, so we spread nudges before re-hitting the same shops.
    .orderBy(asc(contractorProspects.outreachCount), asc(contractorProspects.lastOutreachAt))
    .limit(OUTREACH_EXPORT_BATCH)

  return runOutreachOver(candidates)
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
