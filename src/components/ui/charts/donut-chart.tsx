"use client"

import { cn } from "@/lib/utils"
import { STROKE, BG, type ChartColor } from "./palette"

export type DonutSlice = { label: string; value: number; color?: ChartColor }

/**
 * A donut built from one `pathLength=100` circle per slice (same trick as Gauge,
 * full 360°): each slice's `strokeDasharray` is its percentage, chained via an
 * accumulated negative `strokeDashoffset`. Center carries the total; a compact
 * legend lists each slice. Zero-total renders a single muted ring.
 */
export function DonutChart({
  slices,
  centerValue,
  centerLabel,
  className,
}: {
  slices: DonutSlice[]
  centerValue: React.ReactNode
  centerLabel?: string
  className?: string
}) {
  const visible = slices.filter((s) => s.value > 0)
  const total = visible.reduce((n, s) => n + s.value, 0)

  let offset = 0
  return (
    <div className={cn("flex items-center gap-5 lg:gap-[1.667vw]", className)}>
      <div className="relative size-32 lg:size-[8.5vw] shrink-0">
        <svg viewBox="0 0 36 36" className="size-full -rotate-90">
          <circle cx="18" cy="18" r="15.915" fill="none" pathLength={100} className="stroke-muted" strokeWidth="3.5" />
          {total > 0 &&
            visible.map((s) => {
              const pct = (s.value / total) * 100
              const dash = `${pct} ${100 - pct}`
              const el = (
                <circle
                  key={s.label}
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  pathLength={100}
                  className={STROKE[s.color ?? "muted"]}
                  strokeWidth="3.5"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
              )
              offset += pct
              return el
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-sebenta text-2xl lg:text-[1.8vw] font-bold leading-none tabular-nums">
            {centerValue}
          </span>
          {centerLabel ? (
            <span className="mt-0.5 lg:mt-[0.139vw] text-[10px] lg:text-[0.694vw] font-medium text-muted-foreground">
              {centerLabel}
            </span>
          ) : null}
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5 lg:space-y-[0.417vw] text-sm lg:text-[0.903vw]">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 lg:gap-[0.556vw]">
            <span className={cn("size-2.5 lg:size-[0.694vw] shrink-0 rounded-full", BG[s.color ?? "muted"])} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">{s.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
