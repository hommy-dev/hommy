import { getRequiredUser } from "@/lib/auth/session"
import { getActivePlans } from "@/lib/data/billing"
import { getLeadPricing, AWARD_PRICING } from "@/lib/leads/pricing"
import {
  SIGNUP_BONUS_CREDITS,
  LAUNCH_PROMO_CREDITS,
  LAUNCH_PROMO_EXPIRES_MONTHS,
} from "@/lib/auth/provisioning"
import {
  SCORE_DELTAS,
  reviewScoreDelta,
  FAST_ENGAGE_FRACTION,
  LEAD_FANOUT,
} from "@/lib/config/tunables"
import { cn } from "@/lib/utils"

type ConfigRow = { label: string; value: string }

/** Format a signed delta with an explicit + / − (proper minus glyph) or 0. */
function signed(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `−${Math.abs(n)}`
  return "0"
}

function ConfigRows({ rows }: { rows: ConfigRow[] }) {
  return (
    <dl className="overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border">
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 lg:gap-[0.556vw] px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-sm lg:text-[0.903vw]",
            i > 0 && "border-t border-border",
          )}
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="font-medium text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

const FEATURE_LABEL: Record<string, string> = {
  storm_alerts: "Storm alerts",
  analytics: "Analytics",
  ai_agent: "AI agent",
  marketing: "Marketing tools",
}

function planPrice(cents: number, interval: "month" | "year"): string {
  if (cents <= 0) return "Free"
  const amount = cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2)
  return `$${amount}/${interval === "year" ? "yr" : "mo"}`
}

export default async function AdminSettingsPage() {
  await getRequiredUser("admin")
  const plans = await getActivePlans()
  const engage = getLeadPricing("roofing").engagementCreditCost

  const economy: ConfigRow[] = [
    { label: "Credit unit", value: "1 credit = $1" },
    { label: "Engage a lead (start chat)", value: `${engage} credits` },
    {
      label: "Win fee (on quote acceptance)",
      value: `${AWARD_PRICING.pct * 100}% of the quote · min ${AWARD_PRICING.minCredits} · max ${AWARD_PRICING.maxCredits} credits`,
    },
    { label: "Signup bonus", value: `${SIGNUP_BONUS_CREDITS} credits (never expire)` },
    { label: "Launch promo", value: `${LAUNCH_PROMO_CREDITS} credits (expire after ${LAUNCH_PROMO_EXPIRES_MONTHS} months)` },
  ]

  // Reputation deltas, pulled live from tunables so this can't drift from the
  // scoring engine. Carrots over sticks — see docs §4.3.
  const reviewLow = reviewScoreDelta(1)
  const reviewHigh = reviewScoreDelta(5)
  const reputation: ConfigRow[] = [
    { label: "Engage a lead", value: signed(SCORE_DELTAS.engagement) },
    {
      label: `Engage fast (within ${FAST_ENGAGE_FRACTION * 100}% of the response window)`,
      value: signed(SCORE_DELTAS.fast_engagement),
    },
    { label: "Quote accepted", value: signed(SCORE_DELTAS.quote_accepted) },
    { label: "Review received", value: `${signed(reviewLow)} to ${signed(reviewHigh)} (by stars)` },
    { label: "Decline with a reason", value: `${signed(SCORE_DELTAS.decline_with_reason)} (not penalized)` },
    { label: "Decline with no reason", value: signed(SCORE_DELTAS.decline_no_reason) },
    { label: "Off-platform flag", value: signed(SCORE_DELTAS.off_platform_flag) },
  ]

  return (
    <div className="space-y-8 lg:space-y-[2.222vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">Settings</h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Platform configuration. These values live in code (version-controlled) — change them there, deploy, and they update here.
        </p>
      </header>

      {/* Credit economy */}
      <section className="space-y-3 lg:space-y-[0.833vw]">
        <h2 className="text-lg lg:text-[1.25vw] font-semibold tracking-tight">Credit economy</h2>
        <ConfigRows rows={economy} />
      </section>

      {/* Reputation & scoring */}
      <section className="space-y-3 lg:space-y-[0.833vw]">
        <h2 className="text-lg lg:text-[1.25vw] font-semibold tracking-tight">Reputation &amp; scoring</h2>
        <ConfigRows rows={reputation} />
        <p className="text-xs lg:text-[0.764vw] text-muted-foreground">
          Score floors at 0. A higher score ranks a company higher in lead fan-out (each lead reaches the top {LEAD_FANOUT.maxRecipients} eligible roofers). Speed is rewarded through ranking, never enforced with a penalty.
        </p>
      </section>

      {/* Plans */}
      <section className="space-y-3 lg:space-y-[0.833vw]">
        <h2 className="text-lg lg:text-[1.25vw] font-semibold tracking-tight">Plans</h2>
        <div className="grid gap-3 lg:gap-[0.833vw] sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const features = Object.entries(p.features)
              .filter(([, v]) => v === true)
              .map(([k]) => FEATURE_LABEL[k] ?? k)
            return (
              <div key={p.id} className="flex flex-col rounded-md lg:rounded-[0.556vw] border border-border bg-card p-4 lg:p-[1.111vw]">
                <p className="font-semibold">{p.name}</p>
                <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
                  {planPrice(p.priceCents, p.billingInterval)}
                </p>
                <ul className="mt-3 lg:mt-[0.833vw] flex-1 space-y-1 lg:space-y-[0.278vw] text-[13px] lg:text-[0.903vw] text-muted-foreground">
                  <li>{p.monthlyCredits} credits / mo</li>
                  <li>{p.maxMembers} seat{p.maxMembers === 1 ? "" : "s"}</li>
                  {features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
