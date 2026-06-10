import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser, getMembershipRole } from "@/lib/data/dashboard"
import { SettingsSection } from "@/components/dashboard/settings/settings-section"
import { CompanyProfileForm } from "@/components/dashboard/settings/company-profile-form"

export default async function ContractorCompanyPage() {
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
      title="Company profile"
      description="What homeowners see about your business."
    >
      <CompanyProfileForm
        canManage={canManage}
        initial={{
          companyName: c.companyName ?? "",
          bio: c.bio ?? "",
          logoUrl: c.logoUrl,
          yearsInBusiness: c.yearsInBusiness,
        }}
      />
    </SettingsSection>
  )
}
