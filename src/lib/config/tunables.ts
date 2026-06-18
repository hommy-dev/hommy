// Tunables — the single place for the lead economy's magic numbers. Kept out of
// the actions/jobs so pricing and policy tune without hunting through logic.
// Credit COSTS live in src/lib/leads/pricing.ts (snapshot per lead); this file
// holds distribution breadth, the time windows, and reputation deltas.

// ── Distribution (phase 1: broad, free leads, no engage cap) ──────────────────
// Leads are free to receive, so we fan out widely and let the market self-select
// via who actually quotes — rather than gating to a handful of slots. Ordered by
// score; raise this (or set very high) to reach every eligible pro.
export const LEAD_FANOUT = {
  /** Max companies a single lead is offered to up front (ordered by score). */
  maxRecipients: 25,
} as const

// ── Timing — NO deadlines, no expiry ──────────────────────────────────────────
// Leads do NOT expire on a contractor: an offer stays engageable until the
// homeowner hires or closes the job (broad fan-out means the homeowner is never
// stuck waiting on one pro). Urgency now drives only (a) the "fast responder"
// bonus threshold and (b) when we send a gentle quote REMINDER after engaging —
// never a penalty.
type UrgencyKey = 'emergency' | 'within_week' | 'within_month' | 'planning'

/** Engaging within this many hours of the offer counts as "fast" (score bonus). */
const FAST_RESPONSE_HOURS: Record<UrgencyKey, number> = {
  emergency: 4,
  within_week: 24,
  within_month: 48,
  planning: 72,
}

/** Hours after engaging before we send the contractor a gentle "send a quote" nudge. */
const QUOTE_REMINDER_HOURS: Record<UrgencyKey, number> = {
  emergency: 24,
  within_week: 72,
  within_month: 120, // 5 days
  planning: 168, // 7 days
}

/** Engaging within this fraction of the fast-response window earns the bonus. */
export const FAST_ENGAGE_FRACTION = 0.25

export function responseWindowHours(urgency: string): number {
  return FAST_RESPONSE_HOURS[urgency as UrgencyKey] ?? FAST_RESPONSE_HOURS.within_month
}
export function quoteReminderHours(urgency: string): number {
  return QUOTE_REMINDER_HOURS[urgency as UrgencyKey] ?? QUOTE_REMINDER_HOURS.within_month
}

/** Auto-close a job left totally untouched (no engagement) for this long — just
 *  hygiene against abandoned posts, NOT a contractor deadline. */
export const ABANDONED_LEAD_DAYS = 30

/** Review request is sent this long after a project reaches `completed`. */
export const REVIEW_REQUEST_DELAY_HOURS = 72

// ── Reputation deltas (docs §4.3) ─────────────────────────────────────────────
// Carrots over sticks: reward showing up, speed, doing the work, and winning.
// We do NOT punish a slow response or a slow quote (real deals extend) — speed
// is rewarded via ranking, not enforced. The only negatives left are an explicit
// no-reason decline and an off-platform flag.
export const SCORE_DELTAS = {
  /** Engaged the lead. */
  engagement: 3,
  /** Engaged fast (within FAST_ENGAGE_FRACTION of the window) — replaces `engagement`. */
  fast_engagement: 5,
  /** Homeowner accepted this contractor's quote (the outcome we want). */
  quote_accepted: 15,
  review_received: 0, // computed from stars at write time — see reviewScoreDelta
  /** Declined WITH a reason — honest, keeps the pipeline moving. Not punished. */
  decline_with_reason: 0,
  /** Declined with no reason — mild. */
  decline_no_reason: -3,
  off_platform_flag: -25,
} as const

/** Stars → score delta for a received review (1★ = −8 … 5★ = +8). */
export function reviewScoreDelta(rating: number): number {
  return (Math.max(1, Math.min(5, rating)) - 3) * 4
}
