import { cn } from "@/lib/utils"
import { BG, type ChartColor } from "./palette"

export type BarListItem = { label: string; value: number; hint?: string }

/**
 * Ranked horizontal bars (top cities, star distribution, etc.). The bar is a
 * soft track behind the label so it reads as a list and a chart at once.
 */
export function BarList({
  items,
  color = "primary",
  valueFormat,
}: {
  items: BarListItem[]
  color?: ChartColor
  valueFormat?: (v: number) => string
}) {
  const max = Math.max(1, ...items.map((i) => i.value))

  return (
    <ul className="space-y-1.5 lg:space-y-[0.417vw]">
      {items.map((it) => (
        <li key={it.label} className="relative flex items-center justify-between gap-3 lg:gap-[0.833vw] overflow-hidden rounded-md lg:rounded-[0.417vw] px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw]">
          <span className={cn("absolute inset-y-0 left-0 rounded-md lg:rounded-[0.417vw] opacity-[0.14]", BG[color])} style={{ width: `${Math.max(it.value > 0 ? 6 : 0, Math.round((it.value / max) * 100))}%` }} />
          <span className="relative z-10 min-w-0 flex-1 truncate text-sm lg:text-[0.903vw] text-foreground">{it.label}</span>
          {it.hint ? <span className="relative z-10 shrink-0 text-xs lg:text-[0.764vw] text-muted-foreground">{it.hint}</span> : null}
          <span className="relative z-10 shrink-0 text-sm lg:text-[0.903vw] font-semibold tabular-nums text-foreground">
            {valueFormat ? valueFormat(it.value) : it.value}
          </span>
        </li>
      ))}
    </ul>
  )
}
