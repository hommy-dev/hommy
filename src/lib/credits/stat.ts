// View-model for the "Credits" KPI card (Overview + Analytics).
//
// Reframes the raw balance the way a contractor actually decides on it:
//   • RUNWAY, not just a number — how many more leads the balance can engage
//     (engage costs ENGAGE_COST), because that's the real "can I keep working?".
//   • NEUTRAL weekly change — spending credits to engage leads is the GOAL, so
//     a downward week must not read as red/bad (that would punish the behaviour
//     we want). The chip is informational only.
//   • A negative balance is the aftermath of WINNING a job (the win fee can dip
//     a low balance under zero on the homeowner's accept — see
//     lib/credits/ledger.ts `allowNegative`). So it's framed as "settle up to
//     keep going", not an error state.

import type { StatTone, StatDelta } from "@/components/dashboard/overview/overview-stat"

/** Credits to engage one lead (roofing default — see lib/leads/pricing.ts). */
const ENGAGE_COST = 5

export type CreditStatView = {
  tone: StatTone
  hint: string
  delta?: StatDelta
}

export function creditStatView(balance: number, weeklyChange: number): CreditStatView {
  const runway = Math.max(0, Math.floor(balance / ENGAGE_COST))

  const tone: StatTone = balance < ENGAGE_COST ? "warning" : "success"

  const hint =
    balance < 0
      ? "Refill to keep winning."
      : balance < ENGAGE_COST
        ? "Not enough to engage a lead. Top up soon."
        : `About ${runway} more lead${runway === 1 ? "" : "s"} you can engage`

  // Neutral on purpose: dir "flat" renders a grey chip with no up/down arrow.
  const delta: StatDelta | undefined =
    weeklyChange === 0
      ? undefined
      : { label: `${weeklyChange > 0 ? "+" : "−"}${Math.abs(weeklyChange)} this week`, dir: "flat" }

  return { tone, hint, delta }
}
