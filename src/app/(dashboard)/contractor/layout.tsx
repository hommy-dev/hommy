import type { ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser, getUserCompanies } from "@/lib/data/dashboard"
import { getVerificationState } from "@/lib/contractor/verification"
import { getUnreadCountAction } from "@/lib/notifications/actions"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeaderActions } from "@/components/dashboard/dashboard-header-actions"
import { SidebarNotice } from "@/components/dashboard/sidebar-notice"
import { WorkspaceChip } from "@/components/dashboard/settings/workspace-chip"
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
  const companies = await getUserCompanies(user.id)
  const personName = user.fullName || user.email
  const unreadCount = await getUnreadCountAction()

  return (
    <>
      <DashboardShell
        navItems={CONTRACTOR_NAV}
        notice={buildNotice(contractor)}
        workspace={
          contractor ? (
            <WorkspaceChip
              activeId={contractor.id}
              companies={companies.map((c) => ({
                id: c.id,
                name: c.name ?? "Your company",
                logoUrl: c.logoUrl,
              }))}
              manageHref="/contractor/settings/company"
            />
          ) : undefined
        }
        topRight={
          <DashboardHeaderActions
            user={{
              email: user.email,
              fullName: personName,
              avatarUrl: contractor?.logoUrl ?? null,
            }}
            userId={user.id}
            unreadCount={unreadCount}
            settingsHref="/contractor/settings"
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

  return (
    <SidebarNotice
      tone="success"
      title={`${contractor.creditBalance} credits`}
      body="Spent only when you win a job."
      cta={{ label: "Buy credits", href: "/contractor/settings/billing" }}
    />
  )
}

