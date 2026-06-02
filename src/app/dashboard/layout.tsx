import type { ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CONTRACTOR_NAV } from "@/components/dashboard/dashboard-nav"

// One auth check gates the entire contractor CRM. Redirects if not logged in
// or wrong role — children never render for an unauthorized user.
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)
  const fullName = contractor?.companyName || user.fullName || user.email

  return (
    <DashboardShell
      navItems={CONTRACTOR_NAV}
      user={{
        email: user.email,
        fullName,
        avatarUrl: contractor?.logoUrl ?? null,
      }}
      settingsHref="/dashboard/settings"
    >
      {children}
    </DashboardShell>
  )
}
