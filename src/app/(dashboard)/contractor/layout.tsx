import { Suspense, type ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import {
  getContractorForUser,
  getUserCompanies,
  countNewLeadOffers,
  type Contractor,
} from "@/lib/data/dashboard"
import { getVerificationState } from "@/lib/contractor/verification"
import { getUnreadCountAction } from "@/lib/notifications/actions"
import { countUnreadConversations } from "@/lib/data/conversations"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeaderActions } from "@/components/dashboard/dashboard-header-actions"
import { UserMenu } from "@/components/dashboard/user-menu"
import { SidebarNotice } from "@/components/dashboard/sidebar-notice"
import { NoCompany } from "@/components/dashboard/no-company"
import { CONTRACTOR_NAV } from "@/components/dashboard/dashboard-nav"
import { HeaderActionsSkeleton, UserMenuSkeleton } from "@/components/dashboard/skeletons"
import { RealtimeUserEventsMount } from "@/components/realtime/realtime-user-events-mount"
import { PushNotificationsManager } from "@/components/notifications/push-notifications-manager"

// The shell paints as soon as auth + the active company + the message-badge count
// resolve (all fast). The slower chrome — sidebar notice (new-lead count), the
// company switcher (company list), and the header credits/notifications — stream
// into Suspense slots so the sidebar/nav never wait on them.
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getRequiredUser("contractor")
  const [contractor, unreadMessages] = await Promise.all([
    getContractorForUser(user.id),
    countUnreadConversations(user.id),
  ])
  if (!contractor) {
    return <NoCompany />
  }
  const personName = user.fullName || user.email
  const firstName = personName.split(" ")[0]

  return (
    <>
      <DashboardShell
        navItems={CONTRACTOR_NAV}
        notice={
          <Suspense fallback={null}>
            <ContractorNotice contractor={contractor} firstName={firstName} />
          </Suspense>
        }
        navUnreadCounts={{ "/contractor/messages": unreadMessages }}
        footerUser={
          <Suspense fallback={<UserMenuSkeleton />}>
            <ContractorUserMenu
              userId={user.id}
              email={user.email}
              personName={personName}
              avatarUrl={contractor.logoUrl}
              activeId={contractor.id}
            />
          </Suspense>
        }
        topRight={
          <Suspense fallback={<HeaderActionsSkeleton />}>
            <ContractorHeaderActions userId={user.id} credits={contractor.creditBalance} />
          </Suspense>
        }
      >
        {children}
      </DashboardShell>
      <RealtimeUserEventsMount userId={user.id} role="contractor" />
      <PushNotificationsManager />
    </>
  )
}

async function ContractorNotice({
  contractor,
  firstName,
}: {
  contractor: Contractor
  firstName: string
}) {
  const newLeads = await countNewLeadOffers(contractor.id)
  return buildNotice(contractor, newLeads, firstName)
}

async function ContractorUserMenu({
  userId,
  email,
  personName,
  avatarUrl,
  activeId,
}: {
  userId: string
  email: string
  personName: string
  avatarUrl: string | null
  activeId: string
}) {
  const companies = await getUserCompanies(userId)
  const navCompanies = companies.map((c) => ({
    id: c.id,
    name: c.name ?? "Your company",
    logoUrl: c.logoUrl,
  }))
  return (
    <UserMenu
      user={{ email, fullName: personName, avatarUrl }}
      settingsHref="/contractor/settings"
      workspaces={navCompanies}
      activeWorkspaceId={activeId}
      manageHref="/contractor/settings/company"
    />
  )
}

async function ContractorHeaderActions({
  userId,
  credits,
}: {
  userId: string
  credits: number
}) {
  const unreadCount = await getUnreadCountAction()
  return <DashboardHeaderActions userId={userId} unreadCount={unreadCount} credits={credits} />
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

