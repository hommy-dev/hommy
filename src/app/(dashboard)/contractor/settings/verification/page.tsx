import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser, getMembershipRole } from "@/lib/data/dashboard"
import { getVerificationState } from "@/lib/contractor/verification"
import { SettingsSection } from "@/components/dashboard/settings/settings-section"
import { VerificationForm } from "@/components/dashboard/settings/verification-form"

export default async function ContractorVerificationPage() {
  const user = await getRequiredUser("contractor")
  const c = await getContractorForUser(user.id)
  if (!c) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your company isn’t set up yet.
      </p>
    )
  }

  const role = await getMembershipRole(user.id, c.id)
  const canManage = role === "owner" || role === "admin"

  return (
    <SettingsSection
      title="Verification"
      description="License and insurance — required before you can engage leads."
    >
      <VerificationForm
        canManage={canManage}
        initial={{
          licenseDocUrl: c.licenseDocUrl,
          insuranceDocUrl: c.insuranceDocUrl,
          state: getVerificationState(c),
        }}
      />
    </SettingsSection>
  )
}
