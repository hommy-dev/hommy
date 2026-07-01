import type { ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { countNeedsReplySupport } from "@/lib/data/support"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { UserMenu } from "@/components/dashboard/user-menu"
import { HeaderThemeToggle } from "@/components/dashboard/header-theme-toggle"
import { ADMIN_NAV } from "@/components/dashboard/dashboard-nav"
import { AnalyticsIdentify } from "@/components/analytics/analytics-identify"

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getRequiredUser("admin")
  const openTickets = await countNeedsReplySupport()

  return (
    <>
      <DashboardShell
        navItems={ADMIN_NAV}
        navUnreadCounts={{ "/admin/support": openTickets }}
        brandHref="/admin"
        brandLabel="Hommy Admin"
        topRight={<HeaderThemeToggle />}
        footerUser={
          <UserMenu
            user={{
              email: user.email,
              fullName: user.fullName || user.email,
              avatarUrl: null,
            }}
            settingsHref="/admin/settings"
          />
        }
      >
        {children}
      </DashboardShell>
      <AnalyticsIdentify userId={user.id} email={user.email} role="admin" />
    </>
  )
}
