import type { ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { SettingsShell } from "@/components/dashboard/settings/settings-shell"
import type { SettingsNavGroup } from "@/components/dashboard/settings/settings-nav"

const HOMEOWNER_SETTINGS_GROUPS: SettingsNavGroup[] = [
  {
    label: "Account",
    items: [
      { href: "/homeowner/settings", label: "My profile", icon: "profile", exact: true },
    ],
  },
]

export default async function HomeownerSettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  await getRequiredUser("homeowner")
  return (
    <SettingsShell
      title="Settings"
      description="Manage your account and preferences."
      groups={HOMEOWNER_SETTINGS_GROUPS}
    >
      {children}
    </SettingsShell>
  )
}
