import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import {
  getContractorForUser,
  getMembershipRole,
  getRoofingSubtypes,
} from "@/lib/data/dashboard"
import { getPortfolio, getPortfolioCap } from "@/lib/data/portfolio"
import { getExternalMedia } from "@/lib/data/integrations"
import { ExternalGallery } from "@/components/integrations/external-gallery"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@/components/ui/icon"
import { SettingsSection } from "@/components/dashboard/settings/settings-section"
import { Empty } from "@/components/dashboard/settings/edit-dialog"
import { EditCompanyDialog } from "@/components/dashboard/settings/edit-company-dialog"
import { PortfolioManager } from "@/components/dashboard/portfolio/portfolio-manager"
import { PortfolioGallery } from "@/components/dashboard/portfolio/portfolio-gallery"
import { Suspense } from "react"
import { SettingsSectionSkeleton } from "@/components/dashboard/skeletons"

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return "?"
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

export default function ContractorCompanyPage() {
  return (
    <div className="space-y-8 lg:space-y-[2.222vw]">
      <Suspense
        fallback={
          <>
            <SettingsSectionSkeleton rows={2} />
            <SettingsSectionSkeleton rows={3} />
          </>
        }
      >
        <CompanyBody />
      </Suspense>
    </div>
  )
}

async function CompanyBody() {
  const user = await getRequiredUser("contractor")
  const c = await getContractorForUser(user.id)
  if (!c) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your company isn’t set up yet.
      </p>
    )
  }

  const [role, portfolio, cap, subtypes, googleMedia] = await Promise.all([
    getMembershipRole(user.id, c.id),
    getPortfolio(c.id),
    getPortfolioCap(c.id),
    getRoofingSubtypes(),
    getExternalMedia(c.id),
  ])
  const canManage = role === "owner" || role === "admin"
  const name = c.companyName ?? "Your company"

  return (
    <div className="space-y-8 lg:space-y-[2.222vw]">
    <SettingsSection
      title="Company profile"
      description="What homeowners see about your business."
      action={
        canManage ? (
          <EditCompanyDialog
            initial={{
              companyName: c.companyName ?? "",
              bio: c.bio ?? "",
              logoUrl: c.logoUrl,
              bannerUrl: c.bannerUrl,
              yearsInBusiness: c.yearsInBusiness,
            }}
          />
        ) : undefined
      }
    >
      <div className="space-y-5 lg:space-y-[1.389vw]">
        <div className="flex items-center gap-4 lg:gap-[1.111vw]">
          <Avatar className="size-16 lg:size-[4.444vw] rounded-md lg:rounded-[0.556vw]">
            {c.logoUrl ? (
              <AvatarImage src={c.logoUrl} alt="" className="rounded-md lg:rounded-[0.556vw]" />
            ) : null}
            <AvatarFallback className="rounded-md lg:rounded-[0.556vw] bg-muted text-base lg:text-[1.111vw] font-semibold text-foreground/70">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-lg lg:text-[1.25vw] font-semibold tracking-tight">
              {name}
            </p>
            <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
              {c.yearsInBusiness != null
                ? `${c.yearsInBusiness} year${c.yearsInBusiness === 1 ? "" : "s"} in business`
                : "Roofing contractor"}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-1 lg:mb-[0.278vw] text-xs lg:text-[0.833vw] font-medium uppercase tracking-wider text-muted-foreground">
            About
          </p>
          <p className="text-sm lg:text-[0.972vw] leading-relaxed text-foreground">
            {c.bio || <Empty>No description yet</Empty>}
          </p>
        </div>

        <Link
          href="/contractor/profile"
          className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] text-sm lg:text-[0.972vw] font-medium text-primary hover:underline"
        >
          <Icon name="show" className="size-4 lg:size-[1.111vw]" />
          View public profile
        </Link>
      </div>
    </SettingsSection>

      <SettingsSection
        title="Work"
        description="Showcase completed jobs. Homeowners see these on your profile."
      >
        {canManage ? (
          <PortfolioManager initial={portfolio} cap={cap} subtypes={subtypes} />
        ) : (
          <PortfolioGallery items={portfolio.filter((p) => p.isPublished)} />
        )}

        {googleMedia.length > 0 ? (
          <div className="mt-6 lg:mt-[1.667vw] space-y-3 lg:space-y-[0.833vw] border-t border-border pt-6 lg:pt-[1.667vw]">
            <div>
              <p className="text-xs lg:text-[0.833vw] font-medium uppercase tracking-wider text-muted-foreground">
                From Google
              </p>
              <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
                Photos from your linked Google profile. They also show on your
                public profile. Manage the connection in{" "}
                <Link
                  href="/contractor/integrations"
                  className="font-medium text-primary hover:underline"
                >
                  Integrations
                </Link>
                .
              </p>
            </div>
            <ExternalGallery items={googleMedia} />
          </div>
        ) : null}
      </SettingsSection>
    </div>
  )
}
