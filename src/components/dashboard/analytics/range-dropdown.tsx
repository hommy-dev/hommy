"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Icon } from "@/components/ui/icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RANGE_OPTIONS, rangeLabel } from "./ranges"

export function RangeDropdown({ range }: { range: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  function onChange(value: string) {
    const p = new URLSearchParams(sp.toString())
    p.set("range", value)
    router.push(`${pathname}?${p.toString()}`, { scroll: false })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Date range"
          className="inline-flex h-9 lg:h-[2.5vw] items-center gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] border border-input bg-card px-3 lg:px-[0.833vw] text-sm lg:text-[0.903vw] font-medium outline-none transition-colors hover:bg-muted/60 focus-visible:border-ring data-[state=open]:bg-muted/60"
        >
          <Icon name="calendar" className="size-4 lg:size-[1.111vw] text-muted-foreground" />
          <span className="whitespace-nowrap">{rangeLabel(range)}</span>
          <Icon name="down" className="size-3.5 lg:size-[0.972vw] text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 lg:min-w-[12vw] overflow-hidden p-0">
        <DropdownMenuRadioGroup value={String(range)} onValueChange={onChange}>
          {RANGE_OPTIONS.map((o) => (
            <DropdownMenuRadioItem
              key={o.days}
              value={String(o.days)}
              className="rounded-none border-b border-border/60 last:border-b-0"
            >
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
