import type { ReactNode } from "react"
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

// Synchronous: the static nav paints instantly; auth is enforced by the parent
// homeowner layout, and the page fetches its data inside a Suspense island.
export default function HomeownerSettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <SettingsShell groups={HOMEOWNER_SETTINGS_GROUPS}>
      {children}
    </SettingsShell>
  )
}
