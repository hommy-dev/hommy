import type { ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser, getUserCompanies } from "@/lib/data/dashboard"
import { getVerificationState } from "@/lib/contractor/verification"
import { getUnreadCountAction } from "@/lib/notifications/actions"
import { countUnreadConversations } from "@/lib/data/conversations"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeaderActions } from "@/components/dashboard/dashboard-header-actions"
import { UserMenu } from "@/components/dashboard/user-menu"
import { SidebarNotice } from "@/components/dashboard/sidebar-notice"
import { NoCompany } from "@/components/dashboard/no-company"
import { CONTRACTOR_NAV } from "@/components/dashboard/dashboard-nav"
import { RealtimeUserEventsMount } from "@/components/realtime/realtime-user-events-mount"
import { PushNotificationsManager } from "@/components/notifications/push-notifications-manager"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)
  if (!contractor) {
    return <NoCompany />
  }
  const personName = user.fullName || user.email
  // getUserCompanies doesn't depend on the active company, so fold it into the
  // parallel batch instead of awaiting it in series.
  const [companies, unreadCount, unreadMessages] = await Promise.all([
    getUserCompanies(user.id),
    getUnreadCountAction(),
    countUnreadConversations(user.id),
  ])
  const navCompanies = companies.map((c) => ({
    id: c.id,
    name: c.name ?? "Your company",
    logoUrl: c.logoUrl,
  }))

  return (
    <>
      <DashboardShell
        navItems={CONTRACTOR_NAV}
        notice={buildNotice(contractor)}
        navUnreadCounts={{ "/contractor/messages": unreadMessages }}
        footerUser={
          <UserMenu
            user={{
              email: user.email,
              fullName: personName,
              avatarUrl: contractor?.logoUrl ?? null,
            }}
            settingsHref="/contractor/settings"
            workspaces={navCompanies}
            activeWorkspaceId={contractor.id}
            manageHref="/contractor/settings/company"
          />
        }
        topRight={
          <DashboardHeaderActions
            userId={user.id}
            unreadCount={unreadCount}
            credits={contractor?.creditBalance ?? 0}
          />
        }
      >
        {children}
      </DashboardShell>
      <RealtimeUserEventsMount userId={user.id} role="contractor" />
      <PushNotificationsManager />
    </>
  )
}

function buildNotice(
  contractor: Awaited<ReturnType<typeof getContractorForUser>>,
) {
  if (!contractor) return null
  const state = getVerificationState(contractor)

  if (state === "rejected") {
    return (
      <SidebarNotice
        tone="warning"
        title="Verification needs attention"
        body="Update your license or insurance to keep going."
        cta={{ label: "Review", href: "/contractor/settings/verification" }}
      />
    )
  }

  if (state === "in_review") {
    return (
      <SidebarNotice
        tone="info"
        title="We’re reviewing your verification"
        body="We’ll let you know the moment you’re approved."
        cta={{ label: "View", href: "/contractor/settings/verification" }}
      />
    )
  }

  if (state === "not_started") {
    return (
      <SidebarNotice
        tone="announcement"
        title="Finish verifying"
        body="Add your license to start winning jobs."
        cta={{ label: "Get verified", href: "/contractor/settings/verification" }}
      />
    )
  }

  if (contractor.creditBalance < 0) {
    return (
      <SidebarNotice
        tone="warning"
        title={`You owe ${Math.abs(contractor.creditBalance)} credits`}
        body="From a won job. Top up to take new leads."
        cta={{ label: "Top up", href: "/contractor/settings/billing" }}
      />
    )
  }

  if (contractor.creditBalance < 5) {
    return (
      <SidebarNotice
        tone="announcement"
        title={`${contractor.creditBalance} credits left`}
        body="Low on credits — top up to start new chats."
        cta={{ label: "Buy credits", href: "/contractor/settings/billing" }}
      />
    )
  }

  return (
    <SidebarNotice
      tone="success"
      title={`${contractor.creditBalance} credits`}
      body="Spent only when you win a job."
      cta={{ label: "Buy credits", href: "/contractor/settings/billing" }}
    />
  )
}

