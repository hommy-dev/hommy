// Per-service lead pricing — the credit costs and competition cap that get
// SNAPSHOT onto a lead at creation time (leads.engagementCreditCost /
// awardCreditCost / engageSlots). Kept as config (not hardcoded in the action)
// so tiers tune without a migration — see docs/HOMEI_PLATFORM.md §3.3 / §4.
//
// The credit economy: receiving a lead is free; a small `engagementCreditCost`
// is charged when a contractor engages (first outreach); the full
// `awardCreditCost` is charged only when the homeowner accepts that
// contractor's quote (the "job won" signal). `engageSlots` caps how many
// contractors may engage before the lead locks (capped competition).

export type LeadPricing = {
  /** Small credit charge when a contractor engages (first outreach). */
  engagementCreditCost: number
  /** Full credit charge when the homeowner accepts the contractor's quote. */
  awardCreditCost: number
  /** Max contractors that may engage before the lead locks. */
  engageSlots: number
}

// Keyed by `services.slug`. Roofing values match scripts/seed.ts so seeded and
// freshly-posted leads price identically.
const PRICING_BY_SERVICE: Record<string, LeadPricing> = {
  roofing: { engagementCreditCost: 2, awardCreditCost: 20, engageSlots: 3 },
}

const DEFAULT_PRICING: LeadPricing = {
  engagementCreditCost: 2,
  awardCreditCost: 20,
  engageSlots: 3,
}

/** Pricing snapshot for a service. Falls back to a sane default for any
 *  not-yet-configured vertical so lead creation never blocks on missing config. */
export function getLeadPricing(serviceSlug: string): LeadPricing {
  return PRICING_BY_SERVICE[serviceSlug] ?? DEFAULT_PRICING
}
