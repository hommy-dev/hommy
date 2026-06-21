import { cn } from "@/lib/utils"
import { STROKE, type ChartColor } from "./palette"

/**
 * A 270° speedometer-style gauge (gap at the bottom). The arc fills to
 * value/max; the center carries the figure. `pathLength=100` makes the dash
 * units read as percentages (75 of 100 = the 270° sweep).
 */
export function Gauge({
  value,
  max,
  color = "primary",
  centerValue,
  centerLabel,
  className,
}: {
  value: number
  max: number
  color?: ChartColor
  centerValue: React.ReactNode
  centerLabel?: string
  className?: string
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  const fill = pct * 75

  return (
    <div className={cn("relative size-36 lg:size-[10vw]", className)}>
      <svg viewBox="0 0 36 36" className="size-full">
        <circle cx="18" cy="18" r="15.915" fill="none" pathLength={100} className="stroke-muted" strokeWidth="3" strokeDasharray="75 25" transform="rotate(135 18 18)" />
        <circle
          cx="18"
          cy="18"
          r="15.915"
          fill="none"
          pathLength={100}
          className={STROKE[color]}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${fill} 100`}
          transform="rotate(135 18 18)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-sebenta text-3xl lg:text-[2.5vw] font-bold leading-none tabular-nums">{centerValue}</span>
        {centerLabel ? <span className="mt-1 lg:mt-[0.278vw] text-xs lg:text-[0.833vw] font-medium text-muted-foreground">{centerLabel}</span> : null}
      </div>
    </div>
  )
}
