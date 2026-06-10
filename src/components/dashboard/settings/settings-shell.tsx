import { SettingsNav, type SettingsNavGroup } from "./settings-nav"

// Two-column settings hub: page heading, grouped nav (left), section content
// (right). Each section is its own sub-route, so it SSRs its own data.
export function SettingsShell({
  title,
  description,
  groups,
  children,
}: {
  title: string
  description?: string
  groups: SettingsNavGroup[]
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-5xl lg:max-w-[68vw]">
      <header className="mb-6 lg:mb-[1.667vw]">
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>

      <div className="grid gap-8 lg:gap-[2.222vw] md:grid-cols-[14rem_minmax(0,1fr)] lg:grid-cols-[15vw_minmax(0,1fr)]">
        <aside className="h-fit md:sticky md:top-0">
          <SettingsNav groups={groups} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
