import type { ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { getUnreadCountAction } from "@/lib/notifications/actions"
import { countUnreadConversations } from "@/lib/data/conversations"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { UserMenu } from "@/components/dashboard/user-menu"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { HOMEOWNER_NAV } from "@/components/dashboard/dashboard-nav"
import { RealtimeUserEventsMount } from "@/components/realtime/realtime-user-events-mount"
import { PushNotificationsManager } from "@/components/notifications/push-notifications-manager"

export default async function HomeownerLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getRequiredUser("homeowner")
  const [unreadCount, unreadMessages] = await Promise.all([
    getUnreadCountAction(),
    countUnreadConversations(user.id),
  ])

  return (
    <>
      <DashboardShell
        navItems={HOMEOWNER_NAV}
        brandHref="/homeowner"
        brandLabel="Homei"
        navUnreadCounts={{ "/homeowner/messages": unreadMessages }}
        topRight={
          <NotificationBell userId={user.id} initialUnreadCount={unreadCount} />
        }
        footerUser={
          <UserMenu
            user={{
              email: user.email,
              fullName: user.fullName || user.email,
              avatarUrl: null,
            }}
            settingsHref="/homeowner/settings"
          />
        }
      >
        {children}
      </DashboardShell>
      <RealtimeUserEventsMount userId={user.id} role="homeowner" />
      <PushNotificationsManager />
    </>
  )
}
