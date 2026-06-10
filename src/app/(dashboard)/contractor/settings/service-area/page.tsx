import { getRequiredUser } from "@/lib/auth/session"
import {
  getContractorForUser,
  getMembershipRole,
  getServiceAreas,
  getContractorSubtypes,
  getRoofingSubtypes,
} from "@/lib/data/dashboard"
import { SettingsSection } from "@/components/dashboard/settings/settings-section"
import { ServicesForm } from "@/components/dashboard/settings/services-form"
import { CoverageAreasForm } from "@/components/dashboard/settings/coverage-areas-form"

export default async function ContractorServiceAreaPage() {
  const user = await getRequiredUser("contractor")
  const c = await getContractorForUser(user.id)
  if (!c) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your company isn’t set up yet.
      </p>
    )
  }

  const [role, available, selected, areas] = await Promise.all([
    getMembershipRole(user.id, c.id),
    getRoofingSubtypes(),
    getContractorSubtypes(c.id),
    getServiceAreas(c.id),
  ])
  const canManage = role === "owner" || role === "admin"

  return (
    <div className="space-y-8 lg:space-y-[2.222vw]">
      <SettingsSection
        title="Services you offer"
        description="The types of roofing work you take on. Shown to homeowners and used for matching."
      >
        <ServicesForm available={available} initial={selected} canManage={canManage} />
      </SettingsSection>

      <SettingsSection
        title="Coverage areas"
        description="Jobs within these areas can be matched to you."
      >
        <CoverageAreasForm initialAreas={areas} canManage={canManage} />
      </SettingsSection>
    </div>
  )
}
