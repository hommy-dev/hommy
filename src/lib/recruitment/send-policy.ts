// Outreach send policy — protects deliverability while we warm the sending
// domains and split the two cold-email streams. Pure config/math (no DB, no I/O)
// so it's trivially testable and safe to import anywhere.
//
// Two streams, each on its OWN Resend account/domain, with INDEPENDENT daily
// caps + warmup ramps + guardrails (mailbox providers track reputation per
// domain, so warmup only means something per-domain):
//   • 'lead'   — "a real job in your area is unclaimed" (high value, high intent).
//                Bursty (fires on real jobs), on the protected/primary domain.
//   • 'invite' — pure "join Hommy" cold outreach (lower intent, higher complaint
//                risk). Steady (a daily queue drain), on a SEPARATE domain/account.
// Separate lanes mean an invite-domain complaint spike can never pause the
// money-making lead stream, and neither stream can starve the other's warmup.
//
// Warmup: a brand-new sending domain cannot blast. Each stream starts low and
// ramps ~30% every few days toward its target, so reputation builds not burns.

export type OutreachStream = 'lead' | 'invite'

const WARMUP_START_PER_DAY = 15 // day-0 ceiling for a fresh domain
const WARMUP_STEP = 1.3 // +~30%…
const WARMUP_STEP_DAYS = 3 // …every 3 days
const DEFAULT_TARGET = 98 // steady-state daily ceiling PER DOMAIN (2 under Resend's 100/day)

/**
 * Per-stream target cap + warmup start date. Each stream reads its own env and
 * falls back to the shared globals, so a single-domain setup keeps working:
 *   lead   ← RECRUITMENT_LEAD_DAILY_CAP    / RECRUITMENT_LEAD_WARMUP_START_DATE
 *   invite ← RECRUITMENT_INVITE_DAILY_CAP  / RECRUITMENT_INVITE_WARMUP_START_DATE
 *   both   ← RECRUITMENT_DAILY_CAP / RECRUITMENT_WARMUP_START_DATE (fallback) → 98
 */
function streamPolicy(stream: OutreachStream): { target: number; startDate?: string } {
  const capRaw = Number(
    (stream === 'lead'
      ? process.env.RECRUITMENT_LEAD_DAILY_CAP
      : process.env.RECRUITMENT_INVITE_DAILY_CAP) ?? process.env.RECRUITMENT_DAILY_CAP,
  )
  const target = Number.isFinite(capRaw) && capRaw > 0 ? Math.floor(capRaw) : DEFAULT_TARGET
  const startDate =
    (
      (stream === 'lead'
        ? process.env.RECRUITMENT_LEAD_WARMUP_START_DATE
        : process.env.RECRUITMENT_INVITE_WARMUP_START_DATE) || process.env.RECRUITMENT_WARMUP_START_DATE
    )?.trim() || undefined
  return { target, startDate }
}

/**
 * Emails allowed TODAY on one stream's domain, following THAT domain's own
 * warmup ramp from its own start date. Per-domain because Gmail/Yahoo track
 * reputation per sending domain — a shared budget would let the bursty lead
 * stream starve the invite stream's warmup (and vice-versa). If the stream's
 * start date is unset, we stay at the conservative day-0 ceiling (never blast).
 */
export function streamDailyCap(stream: OutreachStream, now: Date = new Date()): number {
  const { target, startDate } = streamPolicy(stream)
  const startMs = startDate ? Date.parse(startDate) : NaN
  if (Number.isNaN(startMs)) return Math.min(target, WARMUP_START_PER_DAY)

  const days = Math.max(0, Math.floor((now.getTime() - startMs) / 86_400_000))
  const ramped = Math.round(WARMUP_START_PER_DAY * WARMUP_STEP ** Math.floor(days / WARMUP_STEP_DAYS))
  return Math.min(target, Math.max(WARMUP_START_PER_DAY, ramped))
}

export type StreamConfig = { apiKey: string; fromEmail: string }

/**
 * Resend account + From domain for a stream. Lead mails use the primary
 * recruitment domain (kept warm + protected); invites use a SECOND account/
 * domain when configured (RECRUITMENT_INVITE_*), else gracefully fall back to
 * the primary so nothing breaks before the 2nd domain is set up.
 */
export function streamConfig(stream: OutreachStream): StreamConfig {
  const primaryKey = process.env.RECRUITMENT_RESEND_API_KEY || process.env.RESEND_API_KEY || ''
  const primaryFrom = process.env.RECRUITMENT_FROM_EMAIL || ''
  if (stream === 'invite') {
    return {
      apiKey: process.env.RECRUITMENT_INVITE_RESEND_API_KEY || primaryKey,
      fromEmail: process.env.RECRUITMENT_INVITE_FROM_EMAIL || primaryFrom,
    }
  }
  return { apiKey: primaryKey, fromEmail: primaryFrom }
}

/** Auto-throttle thresholds — pause sending if either is exceeded (Gmail/Yahoo
 *  bulk-sender danger zone). Wired to the Resend bounce/complaint webhook. */
export const GUARDRAILS = {
  maxBounceRate: 0.03, // 3%
  maxComplaintRate: 0.001, // 0.1%
} as const

/** Human-readable preview of a stream's warmup ramp (for logs / the admin view). */
export function rampPreview(stream: OutreachStream, fromDay = 0, toDay = 36): { day: number; cap: number }[] {
  const { startDate } = streamPolicy(stream)
  const base = startDate && !Number.isNaN(Date.parse(startDate)) ? Date.parse(startDate) : Date.now()
  const out: { day: number; cap: number }[] = []
  for (let d = fromDay; d <= toDay; d += WARMUP_STEP_DAYS) {
    out.push({ day: d, cap: streamDailyCap(stream, new Date(base + d * 86_400_000)) })
  }
  return out
}
