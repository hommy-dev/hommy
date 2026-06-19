import { getRequiredUser } from "@/lib/auth/session"
import { getPurchaseIntents } from "@/lib/data/admin"
import { CreditGrantsPanel } from "@/components/admin/credit-grants"
import { EmptyState } from "@/components/ui/empty-state"

export default async function AdminCreditsPage() {
  await getRequiredUser("admin")
  const intents = await getPurchaseIntents()
  const pending = intents.filter((i) => i.status === "requested").length

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Credit requests
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Card payments aren&apos;t live yet — settle these by hand. Take payment offline, then grant the
          credits to fulfill the request.{" "}
          {pending > 0
            ? `${pending} request${pending === 1 ? "" : "s"} waiting.`
            : "Nothing waiting right now."}
        </p>
      </header>

      {intents.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="No credit requests yet"
          description="When a contractor tries to buy credits, their request lands here so you can follow up and top them up."
        />
      ) : (
        <CreditGrantsPanel intents={intents} />
      )}
    </div>
  )
}
