import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser, getMembershipRole } from "@/lib/data/dashboard"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@/components/ui/icon"
import { SettingsSection } from "@/components/dashboard/settings/settings-section"
import { Empty } from "@/components/dashboard/settings/edit-dialog"
import { EditCompanyDialog } from "@/components/dashboard/settings/edit-company-dialog"

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return "?"
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

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
  const name = c.companyName ?? "Your company"

  return (
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
  )
}
