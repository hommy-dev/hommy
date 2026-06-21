import { Suspense, type ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { getUnreadCountAction } from "@/lib/notifications/actions"
import { countUnreadConversations } from "@/lib/data/conversations"
import { getHomeownerForUser, getHomeownerNoticeData, type HomeownerNoticeData } from "@/lib/data/homeowner"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SidebarNotice } from "@/components/dashboard/sidebar-notice"
import { UserMenu } from "@/components/dashboard/user-menu"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { HOMEOWNER_NAV } from "@/components/dashboard/dashboard-nav"
import { HeaderActionsSkeleton } from "@/components/dashboard/skeletons"
import { RealtimeUserEventsMount } from "@/components/realtime/realtime-user-events-mount"
import { PushNotificationsManager } from "@/components/notifications/push-notifications-manager"

// Shell paints after auth + the message-badge count (both fast); the notice and
// the notification bell count stream into Suspense slots. The user menu needs no
// extra data, so it renders immediately.
export default async function HomeownerLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getRequiredUser("homeowner")
  const unreadMessages = await countUnreadConversations(user.id)
  const firstName = (user.fullName || user.email).split(" ")[0]

  return (
    <>
      <DashboardShell
        navItems={HOMEOWNER_NAV}
        brandHref="/homeowner"
        brandLabel="Homei"
        notice={
          <Suspense fallback={null}>
            <HomeownerNotice userId={user.id} firstName={firstName} />
          </Suspense>
        }
        navUnreadCounts={{ "/homeowner/messages": unreadMessages }}
        topRight={
          <Suspense fallback={<HeaderActionsSkeleton />}>
            <HomeownerBell userId={user.id} />
          </Suspense>
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

async function HomeownerNotice({ userId, firstName }: { userId: string; firstName: string }) {
  const ho = await getHomeownerForUser(userId)
  if (!ho) return null
  const noticeData = await getHomeownerNoticeData(ho.id)
  if (!noticeData) return null
  return buildHomeownerNotice(noticeData, firstName)
}

async function HomeownerBell({ userId }: { userId: string }) {
  const unreadCount = await getUnreadCountAction()
  return <NotificationBell userId={userId} initialUnreadCount={unreadCount} />
}

/**
 * The single most relevant, personalized notice for this homeowner right now —
 * action states first (quotes to pick, review to leave), then activity, then a
 * gentle "post another job" default. First name + real counts; no em dashes.
 */
function buildHomeownerNotice(d: HomeownerNoticeData, firstName: string) {
  if (d.jobsCount === 0) {
    return (
      <SidebarNotice
        tone="announcement"
        icon="paper"
        eyebrow="Get started"
        title={`Get started, ${firstName}`}
        body="Post a job and local pros come to you with quotes."
        cta={{ label: "Post a job", href: "/get-a-quote" }}
      />
    )
  }

  if (d.quotes > 0) {
    return (
      <SidebarNotice
        tone="info"
        icon="document"
        eyebrow="Quotes"
        urgent
        title={d.quotes === 1 ? "Quotes are in" : `Quotes in on ${d.quotes} jobs`}
        body="Compare them and pick the pro you want."
        cta={{ label: "Review quotes", href: "/homeowner" }}
      />
    )
  }

  if (d.reviewPending.count > 0) {
    return (
      <SidebarNotice
        tone="success"
        icon="star"
        eyebrow="Review"
        title={`How was ${d.reviewPending.contractorName ?? "your pro"}?`}
        body="A quick review helps other homeowners choose."
        cta={{ label: "Leave a review", href: "/homeowner" }}
      />
    )
  }

  if (d.interested > 0) {
    return (
      <SidebarNotice
        tone="info"
        icon="chat"
        eyebrow="Interested"
        urgent
        title={d.interested === 1 ? "A pro is talking to you" : `${d.interested} pros are talking to you`}
        body="Reply to get quotes rolling."
        cta={{ label: "Open messages", href: "/homeowner/messages" }}
      />
    )
  }

  if (d.waiting > 0) {
    return (
      <SidebarNotice
        tone="info"
        icon="time-circle"
        eyebrow="Posted"
        title="Your job is out there"
        body="Local pros are looking. First messages usually land within a day."
        cta={{ label: "View jobs", href: "/homeowner" }}
      />
    )
  }

  if (d.hired.count > 0) {
    return (
      <SidebarNotice
        tone="success"
        icon="tick-square"
        eyebrow="Hired"
        title={`You hired ${d.hired.contractorName ?? "your pro"}`}
        body="They’ll reach out to schedule. Message them anytime."
        cta={{ label: "Open chat", href: "/homeowner/messages" }}
      />
    )
  }

  return (
    <SidebarNotice
      tone="announcement"
      icon="plus"
      eyebrow="New job"
      title={`Need something else done, ${firstName}?`}
      body="Post a job and start getting quotes in about a minute."
      cta={{ label: "Post a job", href: "/get-a-quote" }}
    />
  )
}
