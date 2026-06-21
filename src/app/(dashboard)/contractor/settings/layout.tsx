import type { ReactNode } from "react"
import { SettingsShell } from "@/components/dashboard/settings/settings-shell"
import type { SettingsNavGroup } from "@/components/dashboard/settings/settings-nav"

const CONTRACTOR_SETTINGS_GROUPS: SettingsNavGroup[] = [
  {
    label: "Account",
    items: [
      { href: "/contractor/settings", label: "My account", icon: "profile", exact: true },
    ],
  },
  {
    label: "Company",
    items: [
      { href: "/contractor/settings/company", label: "Company profile", icon: "work" },
      { href: "/contractor/settings/service-area", label: "Service area", icon: "location" },
      { href: "/contractor/settings/team", label: "Team", icon: "user-3" },
      { href: "/contractor/settings/billing", label: "Billing", icon: "wallet" },
      { href: "/contractor/settings/verification", label: "Verification", icon: "shield-done" },
    ],
  },
]

// Synchronous: the static nav (from CONTRACTOR_SETTINGS_GROUPS) paints instantly.
// Auth is already enforced by the parent contractor layout; each section page
// fetches its own data inside a Suspense island.
export default function ContractorSettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <SettingsShell groups={CONTRACTOR_SETTINGS_GROUPS}>
      {children}
    </SettingsShell>
  )
}
