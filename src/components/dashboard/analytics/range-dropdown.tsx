"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { RANGE_OPTIONS } from "./ranges"

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
    <Select value={String(range)} onValueChange={onChange}>
      <SelectTrigger size="sm" aria-label="Date range">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RANGE_OPTIONS.map((o) => (
          <SelectItem key={o.days} value={String(o.days)}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
