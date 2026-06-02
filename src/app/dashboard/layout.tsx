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
        icon={<ShieldGlyph />}
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
        icon={<ShieldGlyph />}
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
        icon={<ShieldGlyph />}
        title="Finish verifying"
        body="Add your license to start winning jobs."
        cta={{ label: "Get verified", href: "/dashboard/profile" }}
      />
    )
  }

  return (
    <SidebarNotice
      tone="success"
      icon={<CoinGlyph />}
      title={`${contractor.creditBalance} credits`}
      body="Spent only when you win a job."
      cta={{ label: "Buy credits", href: "/dashboard/settings" }}
    />
  )
}

function ShieldGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.5l6 2.2v4.6c0 3.6-2.5 6.4-6 7.7-3.5-1.3-6-4.1-6-7.7V4.7l6-2.2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7.3 10l1.8 1.8 3.6-3.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CoinGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9 5.6v6.8M7.2 7.1c0-.8.8-1.3 1.8-1.3s1.8.5 1.8 1.3-.8 1.2-1.8 1.2-1.8.5-1.8 1.3.8 1.3 1.8 1.3 1.8-.5 1.8-1.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
