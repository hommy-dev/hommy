import { Suspense } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import { getBilling, getActivePlans } from "@/lib/data/billing"
import { BillingView } from "@/components/dashboard/settings/billing-view"
import { SettingsSectionSkeleton } from "@/components/dashboard/skeletons"

export default function ContractorBillingPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton rows={4} />}>
      <BillingBody />
    </Suspense>
  )
}

async function BillingBody() {
  const user = await getRequiredUser("contractor")
  const c = await getContractorForUser(user.id)
  if (!c) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your company isn’t set up yet.
      </p>
    )
  }

  const [billing, plans] = await Promise.all([getBilling(c.id), getActivePlans()])

  return <BillingView billing={billing} plans={plans} />
}
