"use client"

import { Icon } from "@/components/ui/icon"
import { SUBTYPE_META } from "@/components/public/get-a-quote/constants"
import { cn } from "@/lib/utils"

// Read-only chip for a service/subtype: an icon tile + label, matching the
// OptionCard aesthetic used in the get-a-quote flow. For display lists (settings
// read view, company profile) — not selectable.
export function ServiceTag({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  const icon = SUBTYPE_META[label]?.icon ?? "home"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] border border-border bg-card px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw]",
        className,
      )}
    >
      <span className="flex size-7 lg:size-[1.944vw] shrink-0 items-center justify-center rounded-md lg:rounded-[0.417vw] bg-muted text-foreground/60">
        <Icon name={icon} className="size-4 lg:size-[1.111vw]" />
      </span>
      <span className="text-sm lg:text-[0.972vw] font-medium text-foreground">
        {label}
      </span>
    </span>
  )
}
