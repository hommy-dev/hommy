// Credit packs + authoritative pricing. 1 credit = $1; larger packs get a small
// discount. Shared by the Buy-credits UI (display) and the server action (which
// recomputes the price from the credit quantity so the client can't tamper with
// the amount). See docs/HOMEI_PLATFORM.md §3.

export type CreditPack = {
  /** Credits granted. */
  credits: number
  /** Price in cents. */
  cents: number
  /** Optional marketing label (e.g. "Most popular"). */
  badge?: string
}

export const CREDIT_PACKS: readonly CreditPack[] = [
  { credits: 50, cents: 5000 },
  { credits: 100, cents: 10000, badge: 'Popular' },
  { credits: 250, cents: 22500 }, // ~10% off
  { credits: 500, cents: 42500 }, // 15% off
] as const

export const MIN_CUSTOM_CREDITS = 10
export const MAX_CUSTOM_CREDITS = 5000

/**
 * Authoritative price (cents) for a credit quantity. Pack sizes use their
 * discounted price; any other amount is billed at the flat $1/credit rate.
 */
export function priceCentsForCredits(credits: number): number {
  const pack = CREDIT_PACKS.find((p) => p.credits === credits)
  if (pack) return pack.cents
  return Math.round(credits) * 100
}

/** "$45" / "$22.50" from cents. */
export function formatCents(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`
}
