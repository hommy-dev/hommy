import type { ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { SettingsShell } from "@/components/dashboard/settings/settings-shell"
import type { SettingsNavGroup } from "@/components/dashboard/settings/settings-nav"

const CONTRACTOR_SETTINGS_GROUPS: SettingsNavGroup[] = [
  {
    label: "Account",
    items: [
      { href: "/contractor/settings/account", label: "My account", icon: "profile" },
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

export default async function ContractorSettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  await getRequiredUser("contractor")
  return (
    <SettingsShell
      title="Settings"
      description="Manage your account and company."
      groups={CONTRACTOR_SETTINGS_GROUPS}
    >
      {children}
    </SettingsShell>
  )
}
