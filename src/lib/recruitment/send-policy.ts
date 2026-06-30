// Outreach send policy — protects deliverability while we warm a new sending
// domain and split the two cold-email streams. Pure config/math (no DB, no I/O)
// so it's trivially testable and safe to import anywhere.
//
// Two streams, deliberately separated so cold-invite complaints can NEVER hurt
// the channel that makes money:
//   • 'lead'   — "a real job in your area is unclaimed" (high value, high intent).
//                Sent first, on the protected/primary outreach domain.
//   • 'invite' — pure "join Hommy" cold outreach (lower intent, higher complaint
//                risk). Fills whatever daily budget is left after leads, on a
//                SEPARATE domain/Resend account (your 2nd account).
//
// Warmup: a brand-new sending domain cannot blast. We start low and ramp ~30%
// every few days toward the target, so reputation builds instead of burning.

export type OutreachStream = 'lead' | 'invite'

const WARMUP_START_PER_DAY = 15 // day-0 ceiling for a fresh domain
const WARMUP_STEP = 1.3 // +~30%…
const WARMUP_STEP_DAYS = 3 // …every 3 days
const DEFAULT_TARGET = 90 // steady-state daily ceiling (overridable)
const INVITE_DAILY_SHARE = 0.5 // invites may use at most this share of the daily cap…
//                                …so the rest is always reserved for lead mails (priority).

function targetCap(): number {
  const n = Number(process.env.RECRUITMENT_DAILY_CAP)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_TARGET
}

/**
 * Total recruitment emails allowed today, following the warmup ramp from
 * RECRUITMENT_WARMUP_START_DATE (YYYY-MM-DD = the first day you started sending).
 * If unset, we stay at the conservative day-0 ceiling (never auto-blast).
 */
export function dailySendCap(now: Date = new Date()): number {
  const target = targetCap()
  const start = process.env.RECRUITMENT_WARMUP_START_DATE?.trim()
  const startMs = start ? Date.parse(start) : NaN
  if (Number.isNaN(startMs)) return Math.min(target, WARMUP_START_PER_DAY)

  const days = Math.max(0, Math.floor((now.getTime() - startMs) / 86_400_000))
  const ramped = Math.round(WARMUP_START_PER_DAY * WARMUP_STEP ** Math.floor(days / WARMUP_STEP_DAYS))
  return Math.min(target, Math.max(WARMUP_START_PER_DAY, ramped))
}

/**
 * Daily ceiling for the INVITE stream — a share of the total cap, so a batch of
 * cold invites can never consume the whole day's budget and starve lead mails.
 */
export function inviteDailyCeiling(now: Date = new Date()): number {
  return Math.floor(dailySendCap(now) * INVITE_DAILY_SHARE)
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

/** Human-readable preview of the warmup ramp (for logs / the admin view). */
export function rampPreview(fromDay = 0, toDay = 36): { day: number; cap: number }[] {
  const start = process.env.RECRUITMENT_WARMUP_START_DATE?.trim()
  const base = start && !Number.isNaN(Date.parse(start)) ? Date.parse(start) : Date.now()
  const out: { day: number; cap: number }[] = []
  for (let d = fromDay; d <= toDay; d += WARMUP_STEP_DAYS) {
    out.push({ day: d, cap: dailySendCap(new Date(base + d * 86_400_000)) })
  }
  return out
}
