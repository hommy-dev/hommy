"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon, type IconName } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

export type SettingsNavItem = {
  href: string
  label: string
  icon: IconName
  /** Render muted + non-interactive (e.g. a section a `member` can't open). */
  disabled?: boolean
}

export type SettingsNavGroup = {
  /** Small uppercase group heading, e.g. "Account" / "Company". */
  label?: string
  items: SettingsNavItem[]
}

// Grouped vertical settings nav (Account / Company / Platform). The two-scope
// split mirrors our identity model: personal vs company.
export function SettingsNav({ groups }: { groups: SettingsNavGroup[] }) {
  const pathname = usePathname() ?? ""

  return (
    <nav className="flex flex-col gap-6 lg:gap-[1.667vw]">
      {groups.map((group, i) => (
        <div key={group.label ?? i} className="space-y-1 lg:space-y-[0.278vw]">
          {group.label ? (
            <p className="px-3 lg:px-[0.833vw] pb-1 lg:pb-[0.278vw] text-[11px] lg:text-[0.764vw] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
          ) : null}

          {group.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`)

            const inner = (
              <>
                <Icon name={item.icon} className="size-4 lg:size-[1.111vw] shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </>
            )

            const base =
              "flex items-center gap-2.5 lg:gap-[0.694vw] rounded-md lg:rounded-[0.556vw] px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] font-medium transition-colors"

            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  aria-disabled
                  className={cn(base, "cursor-not-allowed text-muted-foreground/50")}
                >
                  {inner}
                </span>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  base,
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {inner}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
