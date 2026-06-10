import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import { getBilling, getActivePlans } from "@/lib/data/billing"
import { BillingView } from "@/components/dashboard/settings/billing-view"

export default async function ContractorBillingPage() {
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
