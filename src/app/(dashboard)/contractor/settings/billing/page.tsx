import { Suspense } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import { getBilling, getActivePlans } from "@/lib/data/billing"
import { getReferralStats } from "@/lib/contractor/referral"
import { absoluteUrl } from "@/lib/seo"
import { BillingView } from "@/components/dashboard/settings/billing-view"
import { ReferralCard } from "@/components/dashboard/settings/referral-card"
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

  const [billing, plans, referral] = await Promise.all([
    getBilling(c.id),
    getActivePlans(),
    getReferralStats(c.id),
  ])
  const referralUrl = c.referralCode
    ? absoluteUrl(`/auth/signup/contractor?ref=${c.referralCode}`)
    : null

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <BillingView billing={billing} plans={plans} />
      {referralUrl && (
        <ReferralCard
          url={referralUrl}
          referred={referral.referred}
          rewarded={referral.rewarded}
          earned={referral.earned}
        />
      )}
    </div>
  );
}
