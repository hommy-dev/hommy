// Per-service lead pricing — see docs/HOMMY_PLATFORM.md §3.3 / §4. Kept as config
// (not hardcoded in actions) so tiers tune without a migration.
//
// The credit economy (1 credit = $1):
//   • Receiving / viewing a lead is FREE.
//   • A small flat `engagementCreditCost` is charged when a contractor engages
//     (first outreach). This is the ONLY thing the engage step gates on — it is
//     SNAPSHOT onto the lead at creation (leads.engagementCreditCost).
//   • The WIN fee is charged when the homeowner accepts that contractor's quote.
//     It is NOT a snapshot: it is computed AT ACCEPTANCE from the accepted quote
//     total — `computeAwardCost()` below — so it scales with job value.
//
// NOTE: `leads.award_credit_cost` is DEPRECATED (kept at its 0 default for old
// rows). The win charge no longer reads it; it is derived from the quote total.

/** Per-service config snapshot taken at lead creation. */
export type LeadPricing = {
  /** Small flat credit charge when a contractor engages (first outreach). */
  engagementCreditCost: number
}

/**
 * The WIN fee policy (platform-global, all services for now). The fee is a
 * percentage of the accepted quote total, floored and capped so a tiny job
 * still pays something and a huge job never feels predatory (which is also the
 * #1 deterrent against taking the deal off-platform). The engagement credits the
 * winner already paid are credited toward this fee, so the winner's TOTAL cost
 * to win equals the clamped fee.
 */
export const AWARD_PRICING = {
  /** Fraction of the accepted quote total charged as the win fee. */
  pct: 0.025,
  /** Floor — the smallest possible win fee, in credits. */
  minCredits: 40,
  /** Cap — the largest possible win fee, in credits. */
  maxCredits: 250,
} as const

// Keyed by `services.slug`. Roofing values match scripts/seed.ts so seeded and
// freshly-posted leads price identically.
const PRICING_BY_SERVICE: Record<string, LeadPricing> = {
  roofing: { engagementCreditCost: 5 },
}

const DEFAULT_PRICING: LeadPricing = {
  engagementCreditCost: 5,
}

/** Engagement-cost snapshot for a service. Falls back to a sane default for any
 *  not-yet-configured vertical so lead creation never blocks on missing config. */
export function getLeadPricing(serviceSlug: string): LeadPricing {
  return PRICING_BY_SERVICE[serviceSlug] ?? DEFAULT_PRICING
}

/**
 * The credit charge for winning a job, computed when the homeowner accepts.
 *
 * @param quoteTotalUsd  accepted quote total in dollars (estimates.total, parsed)
 * @param engagePaid     engagement credits the winner already paid (credited back)
 * @returns whole credits to charge on `lead_won` (never below 0)
 */
export function computeAwardCost(quoteTotalUsd: number, engagePaid: number): number {
  const safeTotal = Number.isFinite(quoteTotalUsd) && quoteTotalUsd > 0 ? quoteTotalUsd : 0
  const grossFee = Math.round(safeTotal * AWARD_PRICING.pct)
  const fee = Math.min(AWARD_PRICING.maxCredits, Math.max(AWARD_PRICING.minCredits, grossFee))
  return Math.max(0, fee - Math.max(0, engagePaid))
}
