// Tunables — the single place for the lead economy's magic numbers. Kept out of
// the actions/jobs so pricing and policy tune without hunting through logic.
// Credit COSTS live in src/lib/leads/pricing.ts (snapshot per lead); this file
// holds the time windows and reputation deltas.

/** SLA windows that drive the cascade (docs/HOMEI_PLATFORM.md §4.1 step 6). */
export const LEAD_SLA = {
  /** Hours a contractor has to engage after VIEWING an offer. */
  POST_VIEW_HOURS: 24,
  /** Hours a contractor has to engage when they never viewed the offer. */
  NO_VIEW_HOURS: 48,
} as const

/** Review request is sent this long after a project reaches `completed`. */
export const REVIEW_REQUEST_DELAY_HOURS = 72

/**
 * Profile-score deltas per score_event kind (docs §4.3). Positive lifts the
 * cached `contractors.profile_score`; negative decays it. Tune freely — the
 * ledger (`score_events`) keeps the audit trail regardless.
 */
export const SCORE_DELTAS = {
  fast_engagement: 5,
  quote_accepted: 15,
  review_received: 0, // computed from stars at write time (rating - 3) * 4
  lead_ignored_no_reason: -10,
  lead_ignored_with_reason: -4,
  slow_response: -6,
  off_platform_flag: -25,
  pattern_no_quotes: -8,
} as const

/** Stars → score delta for a received review (1★ = −8 … 5★ = +8). */
export function reviewScoreDelta(rating: number): number {
  return (Math.max(1, Math.min(5, rating)) - 3) * 4
}
