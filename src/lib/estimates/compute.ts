// Estimate math — service-neutral. Totals are computed in integer cents to avoid
// float drift, then returned as 2-dp decimal strings (the DB stores money as
// decimal strings; parse with parseFloat only for display).

export type LineItemInput = { label: string; amount: number } // amount in dollars
export type EstimateTotals = { subtotal: string; taxAmount: string; total: string }

const toCents = (dollars: number) => Math.round((Number.isFinite(dollars) ? dollars : 0) * 100)
const fromCents = (cents: number) => (cents / 100).toFixed(2)

/** subtotal = Σ line items; tax = subtotal × rate%; total = subtotal + tax. */
export function computeTotals(lineItems: LineItemInput[], taxRatePct: number): EstimateTotals {
  const subtotalCents = lineItems.reduce((sum, li) => sum + Math.max(0, toCents(li.amount)), 0)
  const rate = Number.isFinite(taxRatePct) ? Math.max(0, Math.min(100, taxRatePct)) : 0
  const taxCents = Math.round(subtotalCents * (rate / 100))
  return {
    subtotal: fromCents(subtotalCents),
    taxAmount: fromCents(taxCents),
    total: fromCents(subtotalCents + taxCents),
  }
}

/** Normalize a line item's dollar amount to a 2-dp decimal string for storage. */
export function lineItemAmount(amount: number): string {
  return fromCents(toCents(amount))
}
