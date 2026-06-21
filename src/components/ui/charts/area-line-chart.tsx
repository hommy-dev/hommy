"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { TEXT, type ChartColor } from "./palette"

export type Point = { x: string; y: number }

export type ValueFormat = "number" | "currency" | "rating"

function formatValue(v: number, format: ValueFormat): string {
  if (format === "rating") return v.toFixed(1)
  if (format === "currency") {
    const a = Math.round(v)
    return Math.abs(a) >= 1000 ? `$${(a / 1000).toFixed(Math.abs(a) >= 10000 ? 0 : 1)}k` : `$${a}`
  }
  return String(Math.round(v))
}

/** Smooth a set of [x,y] (in a 0–100 box) into a cubic-bezier path. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return ""
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const t = 0.18
    const c1x = p1[0] + (p2[0] - p0[0]) * t
    const c1y = p1[1] + (p2[1] - p0[1]) * t
    const c2x = p2[0] - (p3[0] - p1[0]) * t
    const c2y = p2[1] - (p3[1] - p1[1]) * t
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
  }
  return d
}

export function AreaLineChart({
  series,
  compare,
  color = "primary",
  seriesName = "This period",
  compareName = "Previous",
  format = "number",
  className,
}: {
  series: Point[]
  compare?: Point[]
  color?: ChartColor
  seriesName?: string
  compareName?: string
  format?: ValueFormat
  className?: string
}) {
  const yFormat = (v: number) => formatValue(v, format)
  const plotRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const n = series.length
  const all = [...series.map((p) => p.y), ...(compare?.map((p) => p.y) ?? [])]
  const max = Math.max(1, ...all)
  const min = Math.min(0, ...all)
  const span = max - min || 1

  const nx = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * 100)
  const ny = (v: number) => (1 - (v - min) / span) * 100

  const mainPts = series.map((p, i) => [nx(i), ny(p.y)] as [number, number])
  const cmpPts = compare?.map((p, i) => [nx(i), ny(p.y)] as [number, number])
  const line = smoothPath(mainPts)
  const areaPath = mainPts.length ? `${line} L${nx(n - 1).toFixed(2)},100 L0,100 Z` : ""

  function onMove(e: React.PointerEvent) {
    const el = plotRef.current
    if (!el || n === 0) return
    const rect = el.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / rect.width
    setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))))
  }

  const yTicks = [max, min + span / 2, min]
  const xIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1]

  return (
    <div className={cn("flex gap-2 lg:gap-[0.556vw]", className)}>
      {/* Y axis */}
      <div className="flex w-9 lg:w-[2.8vw] shrink-0 flex-col justify-between py-0.5 text-right text-[10px] lg:text-[0.694vw] tabular-nums text-muted-foreground">
        {yTicks.map((t, i) => (
          <span key={i}>{yFormat(t)}</span>
        ))}
      </div>

      {/* Plot (text color = chart color, so currentColor paints line/area/dot) */}
      <div className="min-w-0 flex-1">
        <div
          ref={plotRef}
          className={cn("relative h-40 lg:h-[11vw] w-full touch-none", TEXT[color])}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {[0, 50, 100].map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-border/60" style={{ top: `${t}%` }} />
          ))}

          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {areaPath ? <path d={areaPath} fill="currentColor" opacity={0.1} stroke="none" /> : null}
            {cmpPts ? (
              <path d={smoothPath(cmpPts)} fill="none" className="stroke-muted-foreground" strokeWidth={1.5} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity={0.7} />
            ) : null}
            {line ? <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
          </svg>

          {hover !== null && mainPts[hover] ? (
            <>
              <div className="absolute top-0 bottom-0 w-px bg-foreground/20" style={{ left: `${mainPts[hover][0]}%` }} />
              <div
                className="absolute size-2.5 lg:size-[0.694vw] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-current"
                style={{ left: `${mainPts[hover][0]}%`, top: `${mainPts[hover][1]}%` }}
              />
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-card px-2 lg:px-[0.556vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.764vw] shadow-md"
                style={{ left: `${mainPts[hover][0]}%`, top: `${mainPts[hover][1]}%`, marginTop: "-8px" }}
              >
                <p className="font-medium text-foreground">{series[hover].x}</p>
                <p className="tabular-nums text-foreground">
                  {seriesName}: <span className="font-semibold">{yFormat(series[hover].y)}</span>
                </p>
                {compare?.[hover] ? (
                  <p className="tabular-nums text-muted-foreground">
                    {compareName}: {yFormat(compare[hover].y)}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {/* X axis */}
        <div className="mt-1.5 lg:mt-[0.417vw] flex justify-between text-[10px] lg:text-[0.694vw] text-muted-foreground">
          {xIdx.map((i) => (
            <span key={i}>{series[i]?.x}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
