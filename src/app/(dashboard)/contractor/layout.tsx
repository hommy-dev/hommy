import type { ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser, getUserCompanies, countNewLeadOffers } from "@/lib/data/dashboard"
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
  const firstName = personName.split(" ")[0]
  // getUserCompanies doesn't depend on the active company, so fold it into the
  // parallel batch instead of awaiting it in series.
  const [companies, unreadCount, unreadMessages, newLeads] = await Promise.all([
    getUserCompanies(user.id),
    getUnreadCountAction(),
    countUnreadConversations(user.id),
    countNewLeadOffers(contractor.id),
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
        notice={buildNotice(contractor, newLeads, firstName)}
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

/**
 * The single most relevant, personalized notice for this contractor right now —
 * a priority ladder (problems first, then opportunity, then a healthy default).
 * Copy is woven with their first name + real numbers. No em dashes (copy rule).
 */
function buildNotice(
  contractor: Awaited<ReturnType<typeof getContractorForUser>>,
  newLeads: number,
  firstName: string,
) {
  if (!contractor) return null
  const state = getVerificationState(contractor)
  const balance = contractor.creditBalance

  if (state === "rejected") {
    return (
      <SidebarNotice
        tone="warning"
        icon="danger-triangle"
        eyebrow="Action needed"
        urgent
        title={`Quick fix needed, ${firstName}`}
        body="Update your license or insurance to keep winning jobs."
        cta={{ label: "Review", href: "/contractor/settings/verification" }}
      />
    )
  }

  if (balance < 0) {
    return (
      <SidebarNotice
        tone="warning"
        icon="danger-triangle"
        eyebrow="Balance due"
        urgent
        title={`You owe ${Math.abs(balance)} credits`}
        body="From a won job 🎉 Settle up to take new leads."
        cta={{ label: "Top up", href: "/contractor/settings/billing" }}
      />
    )
  }

  if (state === "in_review") {
    return (
      <SidebarNotice
        tone="info"
        icon="time-circle"
        eyebrow="In review"
        title="We’re reviewing you"
        body="We’ll ping you the moment you’re approved, usually within a day."
        cta={{ label: "View status", href: "/contractor/settings/verification" }}
      />
    )
  }

  if (state === "not_started") {
    return (
      <SidebarNotice
        tone="announcement"
        icon="shield-done"
        eyebrow="Get verified"
        title={`One step left, ${firstName}`}
        body="Add your license to start winning jobs near you."
        cta={{ label: "Get verified", href: "/contractor/settings/verification" }}
      />
    )
  }

  if (balance < 5) {
    return (
      <SidebarNotice
        tone="announcement"
        icon="wallet"
        eyebrow="Running low"
        urgent
        title={`${balance} credit${balance === 1 ? "" : "s"} left`}
        body="Top up so you don’t miss your next win."
        cta={{ label: "Top up", href: "/contractor/settings/billing" }}
      />
    )
  }

  if (newLeads > 0) {
    return (
      <SidebarNotice
        tone="info"
        icon="discovery"
        eyebrow="New leads"
        urgent
        title={`${newLeads} new lead${newLeads === 1 ? "" : "s"} near you 🔥`}
        body="Pros who reply first win most. Jump in."
        cta={{ label: "View leads", href: "/contractor/jobs" }}
      />
    )
  }

  return (
    <SidebarNotice
      tone="success"
      icon="wallet"
      eyebrow="Wallet"
      title={`${balance} credits ready, ${firstName}`}
      body="Only spent when you win a job."
      cta={{ label: "Buy credits", href: "/contractor/settings/billing" }}
    />
  )
}

