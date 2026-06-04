import type { ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { UserMenu } from "@/components/dashboard/user-menu"
import { HOMEOWNER_NAV } from "@/components/dashboard/dashboard-nav"

export default async function HomeownerLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getRequiredUser("homeowner")

  return (
    <DashboardShell
      navItems={HOMEOWNER_NAV}
      brandHref="/homeowner"
      brandLabel="Homei"
      messagesHref="/homeowner/messages"
      topRight={
        <UserMenu
          user={{
            email: user.email,
            fullName: user.fullName || user.email,
            avatarUrl: null,
          }}
          settingsHref="/homeowner/profile"
          compact
        />
      }
    >
      {children}
    </DashboardShell>
  )
}
