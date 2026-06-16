import { SettingsNav, type SettingsNavGroup } from "./settings-nav"

// Two-column settings hub: page heading, grouped nav (left), section content
// (right). Each section is its own sub-route, so it SSRs its own data.
export function SettingsShell({
  groups,
  children,
}: {
  groups: SettingsNavGroup[]
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full">
      <div className="grid gap-8 lg:gap-[2.222vw] md:grid-cols-[14rem_minmax(0,1fr)] lg:grid-cols-[15vw_minmax(0,1fr)]">
        <aside className="h-fit md:sticky md:top-0">
          <SettingsNav groups={groups} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
