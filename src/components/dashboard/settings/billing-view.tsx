import { SettingsSection } from "@/components/dashboard/settings/settings-section"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { BuyCreditsDialog } from "@/components/dashboard/settings/buy-credits-dialog"
import { cn } from "@/lib/utils"
import type {
  BillingData,
  CreditKind,
  LedgerEntry,
  PlanOption,
} from "@/lib/data/billing"

const KIND_LABEL: Record<CreditKind, string> = {
  signup_bonus: "Signup bonus",
  purchase: "Credit purchase",
  plan_grant: "Monthly plan credits",
  lead_engagement: "Lead engaged",
  lead_won: "Lead won",
  ai_agent: "AI agent",
  marketing: "Marketing",
  refund: "Refund",
  promo: "Promo credits",
  expiry: "Credits expired",
  adjustment: "Adjustment",
}

const FEATURE_LABEL: Record<string, string> = {
  storm_alerts: "Storm alerts",
  analytics: "Analytics",
  ai_agent: "AI agent",
  marketing: "Marketing tools",
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)
}

function formatPrice(cents: number, interval: "month" | "year"): string {
  if (cents <= 0) return "Free"
  const amount = cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2)
  return `$${amount}/${interval === "year" ? "yr" : "mo"}`
}

export function BillingView({
  billing,
  plans,
}: {
  billing: BillingData
  plans: PlanOption[]
}) {
  const { plan, creditBalance, ledger } = billing

  return (
    <div className="space-y-8 lg:space-y-[2.222vw]">
      {/* Current plan */}
      <SettingsSection
        title="Plan"
        description="Your subscription and what it includes."
        action={
          <Button variant="outline" disabled title="Coming soon">
            Change plan
          </Button>
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-4 lg:gap-[1.111vw]">
          <div>
            <p className="text-xl lg:text-[1.5vw] font-semibold tracking-tight">
              {plan?.name ?? "Free"}
            </p>
            <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-muted-foreground">
              {plan ? formatPrice(plan.priceCents, plan.billingInterval) : "$0/mo"}
              {plan?.currentPeriodEnd
                ? ` · ${plan.cancelAtPeriodEnd ? "ends" : "renews"} ${formatDate(plan.currentPeriodEnd)}`
                : ""}
            </p>
          </div>
          <dl className="flex gap-6 lg:gap-[1.667vw] text-sm lg:text-[0.972vw]">
            <div>
              <dt className="text-muted-foreground">Monthly credits</dt>
              <dd className="font-medium">{plan?.monthlyCredits ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Seats</dt>
              <dd className="font-medium">{plan?.maxMembers ?? 1}</dd>
            </div>
          </dl>
        </div>
      </SettingsSection>

      {/* Credits */}
      <SettingsSection
        title="Credits"
        description="Spent to engage leads and win jobs. Plan credits renew each cycle; purchased credits roll over."
        action={<BuyCreditsDialog />}
      >
        <div className="flex items-baseline gap-2 lg:gap-[0.556vw]">
          <span className="font-sebenta text-4xl lg:text-[3vw] font-bold tracking-tight">
            {creditBalance}
          </span>
          <span className="text-sm lg:text-[0.972vw] text-muted-foreground">
            credits available
          </span>
        </div>
      </SettingsSection>

      {/* Plans comparison */}
      {plans.length > 0 && (
        <section className="space-y-4 lg:space-y-[1.111vw]">
          <div>
            <h2 className="text-lg lg:text-[1.25vw] font-semibold tracking-tight">
              Plans
            </h2>
            <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-muted-foreground">
              Upgrade for more credits, seats, and tools.
            </p>
          </div>
          <div className="grid gap-3 lg:gap-[0.833vw] sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => {
              const current = p.name === plan?.name
              const features = Object.entries(p.features)
                .filter(([, v]) => v === true)
                .map(([k]) => FEATURE_LABEL[k] ?? k)
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex flex-col rounded-md lg:rounded-[0.556vw] border bg-card p-4 lg:p-[1.111vw]",
                    current ? "border-primary" : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 lg:gap-[0.556vw]">
                    <p className="font-semibold">{p.name}</p>
                    {current ? (
                      <span className="rounded-full bg-primary/10 px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-[11px] lg:text-[0.764vw] font-semibold text-primary">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
                    {formatPrice(p.priceCents, p.billingInterval)}
                  </p>
                  <ul className="mt-3 lg:mt-[0.833vw] flex-1 space-y-1 lg:space-y-[0.278vw] text-[13px] lg:text-[0.903vw] text-muted-foreground">
                    <li>{p.monthlyCredits} credits / mo</li>
                    <li>
                      {p.maxMembers} seat{p.maxMembers === 1 ? "" : "s"}
                    </li>
                    {features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <Button
                    variant={current ? "outline" : "default"}
                    size="sm"
                    disabled
                    title="Coming soon"
                    className="mt-4 lg:mt-[1.111vw] w-full"
                  >
                    {current ? "Current plan" : "Upgrade"}
                  </Button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Ledger */}
      <section className="space-y-4 lg:space-y-[1.111vw]">
        <h2 className="text-lg lg:text-[1.25vw] font-semibold tracking-tight">
          Billing history
        </h2>
        {ledger.length === 0 ? (
          <EmptyState
            size="sm"
            icon="wallet"
            title="No credit activity yet"
            description="Your plan credits, purchases, and lead charges will show up here as they happen."
          />
        ) : (
          <div className="overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border">
            <table className="w-full text-sm lg:text-[0.972vw]">
              <thead className="border-b border-border bg-muted/40 text-left text-xs lg:text-[0.833vw] text-muted-foreground">
                <tr>
                  <th className="px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] font-medium">Date</th>
                  <th className="px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] font-medium">Description</th>
                  <th className="px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] text-right font-medium">Amount</th>
                  <th className="px-4 lg:px-[1.111vw] py-2.5 lg:py-[0.694vw] text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledger.map((e) => (
                  <LedgerRow key={e.id} entry={e} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const positive = entry.amount >= 0
  return (
    <tr>
      <td className="whitespace-nowrap px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-muted-foreground">
        {formatDate(entry.createdAt)}
      </td>
      <td className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]">
        {KIND_LABEL[entry.kind] ?? entry.kind}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-right font-medium tabular-nums",
          positive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
        )}
      >
        {positive ? "+" : "−"}
        {Math.abs(entry.amount)}
      </td>
      <td className="whitespace-nowrap px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-right tabular-nums text-muted-foreground">
        {entry.balanceAfter}
      </td>
    </tr>
  )
}
