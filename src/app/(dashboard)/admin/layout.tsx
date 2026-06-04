import type { ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { UserMenu } from "@/components/dashboard/user-menu"
import { ADMIN_NAV } from "@/components/dashboard/dashboard-nav"

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getRequiredUser("admin")

  return (
    <DashboardShell
      navItems={ADMIN_NAV}
      brandHref="/admin"
      brandLabel="Homei Admin"
      topRight={
        <UserMenu
          user={{
            email: user.email,
            fullName: user.fullName || user.email,
            avatarUrl: null,
          }}
          settingsHref="/admin/settings"
          compact
        />
      }
    >
      {children}
    </DashboardShell>
  )
}
