import { Suspense } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import {
  getContractorForUser,
  getMembershipRole,
  getServiceAreas,
  getContractorSubtypes,
  getRoofingSubtypes,
} from "@/lib/data/dashboard"
import { coverageSummary } from "@/lib/coverage"
import { ServiceTag } from "@/components/ui/service-tag"
import { SettingsSection } from "@/components/dashboard/settings/settings-section"
import { Empty } from "@/components/dashboard/settings/edit-dialog"
import { EditServicesDialog } from "@/components/dashboard/settings/edit-services-dialog"
import { ManageAreasDialog } from "@/components/dashboard/settings/manage-areas-dialog"
import { SettingsSectionSkeleton } from "@/components/dashboard/skeletons"

export default function ContractorServiceAreaPage() {
  return (
    <div className="space-y-8 lg:space-y-[2.222vw]">
      <Suspense
        fallback={
          <>
            <SettingsSectionSkeleton rows={1} />
            <SettingsSectionSkeleton rows={2} />
          </>
        }
      >
        <ServiceAreaBody />
      </Suspense>
    </div>
  )
}

async function ServiceAreaBody() {
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
        description="Shown to homeowners and used for matching."
        action={
          canManage ? (
            <EditServicesDialog available={available} initial={selected} />
          ) : undefined
        }
      >
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-2 lg:gap-[0.556vw]">
            {selected.map((s) => (
              <ServiceTag key={s} label={s} />
            ))}
          </div>
        ) : (
          <Empty>No services selected yet</Empty>
        )}
      </SettingsSection>

      <SettingsSection
        title="Coverage areas"
        description="Jobs within these areas can be matched to you."
        action={canManage ? <ManageAreasDialog initialAreas={areas} /> : undefined}
      >
        {areas.length > 0 ? (
          <ul className="divide-y divide-border">
            {areas.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 lg:gap-[0.833vw] py-3 lg:py-[0.833vw] first:pt-0 last:pb-0"
              >
                <span className="min-w-0 truncate text-sm lg:text-[0.972vw] font-medium text-foreground">
                  {a.label ?? "Coverage area"}
                </span>
                <span className="shrink-0 text-[13px] lg:text-[0.903vw] text-muted-foreground">
                  {coverageSummary(a)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No coverage areas yet</Empty>
        )}
      </SettingsSection>
    </div>
  )
}
