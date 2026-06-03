import type { ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import { getVerificationState } from "@/lib/contractor/verification"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardHeaderActions } from "@/components/dashboard/dashboard-header-actions"
import { SidebarNotice } from "@/components/dashboard/sidebar-notice"
import { CONTRACTOR_NAV } from "@/components/dashboard/dashboard-nav"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)
  const personName = user.fullName || user.email

  return (
    <DashboardShell
      navItems={CONTRACTOR_NAV}
      notice={buildNotice(contractor)}
      topRight={
        <DashboardHeaderActions
          user={{
            email: user.email,
            fullName: personName,
            avatarUrl: contractor?.logoUrl ?? null,
          }}
          settingsHref="/dashboard/settings"
          credits={contractor?.creditBalance ?? 0}
        />
      }
    >
      {children}
    </DashboardShell>
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
        cta={{ label: "Review", href: "/dashboard/profile" }}
      />
    )
  }

  if (state === "in_review") {
    return (
      <SidebarNotice
        tone="info"
        title="We’re reviewing your verification"
        body="We’ll let you know the moment you’re approved."
        cta={{ label: "View", href: "/dashboard/profile" }}
      />
    )
  }

  if (state === "not_started") {
    return (
      <SidebarNotice
        tone="announcement"
        title="Finish verifying"
        body="Add your license to start winning jobs."
        cta={{ label: "Get verified", href: "/dashboard/profile" }}
      />
    )
  }

  return (
    <SidebarNotice
      tone="success"
      title={`${contractor.creditBalance} credits`}
      body="Spent only when you win a job."
      cta={{ label: "Buy credits", href: "/dashboard/settings" }}
    />
  )
}

