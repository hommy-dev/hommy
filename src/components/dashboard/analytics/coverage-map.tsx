"use client"

import { useMemo } from "react"
import { geoAlbersUsa, geoPath } from "d3-geo"
import { feature } from "topojson-client"
import statesTopo from "us-atlas/states-10m.json"
import { cn } from "@/lib/utils"
import type { CoveragePoint } from "@/lib/data/analytics"

const W = 960
const H = 600
const TARGET_AR = 1.45 // viewBox width / height

function arcPath([x1, y1]: [number, number], [x2, y2]: [number, number]): string {
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.hypot(dx, dy) || 1
  const bulge = dist * 0.22
  const cx = (x1 + x2) / 2 - (dy / dist) * bulge
  const cy = (y1 + y2) / 2 + (dx / dist) * bulge
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`
}

export function CoverageMap({
  hub,
  origins,
  className,
  legend,
}: {
  hub: CoveragePoint | null
  origins: CoveragePoint[]
  className?: string
  /** Legend labels. Omit for the default lead-flow legend; pass `null` to hide. */
  legend?: { you?: string; origin: string } | null
}) {
  const m = useMemo(() => {
    const fc = feature(statesTopo, statesTopo.objects.states)
    const projection = geoAlbersUsa().fitSize([W, H], fc)
    const path = geoPath(projection)
    const states = fc.features.map((f) => path(f) ?? "")
    const project = (p: CoveragePoint) => projection([p.lng, p.lat])

    const hubXY = hub ? project(hub) : null
    const pts = origins
      .map((o) => ({ ...o, xy: project(o) }))
      .filter((o): o is typeof o & { xy: [number, number] } => o.xy != null)

    // Auto-fit the viewBox to the points (so single-metro data isn't a tiny dot).
    const all: [number, number][] = [...(hubXY ? [hubXY] : []), ...pts.map((p) => p.xy)]
    let viewBox = `0 0 ${W} ${H}`
    let span = W
    if (all.length > 0) {
      const xs = all.map((a) => a[0])
      const ys = all.map((a) => a[1])
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2
      let halfW = Math.max((Math.max(...xs) - Math.min(...xs)) / 2, 70) * 1.7
      let halfH = Math.max((Math.max(...ys) - Math.min(...ys)) / 2, 48) * 1.7
      if (halfW / halfH > TARGET_AR) halfH = halfW / TARGET_AR
      else halfW = halfH * TARGET_AR
      span = 2 * halfW
      viewBox = `${(cx - halfW).toFixed(1)} ${(cy - halfH).toFixed(1)} ${span.toFixed(1)} ${(2 * halfH).toFixed(1)}`
    }

    return { states, hubXY, pts, viewBox, span }
  }, [hub, origins])

  if (!hub && origins.length === 0) {
    return (
      <div className={cn("flex items-center justify-center rounded-lg lg:rounded-[0.694vw] bg-muted/40 p-6 lg:p-[1.667vw] text-center", className)} style={{ aspectRatio: TARGET_AR }}>
        <p className="max-w-xs text-sm lg:text-[0.903vw] text-muted-foreground">
          Set your coverage area so we can map where your leads come from.
        </p>
      </div>
    )
  }

  const lg =
    legend === null ? null : legend ?? { you: "You", origin: "Lead origin" }

  // Sizes relative to the (possibly zoomed) viewBox so dots stay visually consistent.
  const dotR = m.span * 0.011
  const hubR = m.span * 0.016
  const haloR = m.span * 0.034

  return (
    <div className={className}>
      <svg viewBox={m.viewBox} preserveAspectRatio="xMidYMid meet" className="w-full" style={{ aspectRatio: TARGET_AR }}>
        <g className="text-primary">
          {m.states.map((d, i) => (
            <path key={i} d={d} className="fill-muted stroke-card" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {m.hubXY
            ? m.pts.map((o, i) => (
                <path key={`arc-${i}`} d={arcPath(m.hubXY!, o.xy)} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" opacity={0.45} vectorEffect="non-scaling-stroke" />
              ))
            : null}

          {m.pts.map((o, i) => (
            <circle key={`dot-${i}`} cx={o.xy[0]} cy={o.xy[1]} r={dotR + Math.min(dotR * 1.4, (o.leads ?? 1) * dotR * 0.25)} fill="currentColor" opacity={0.7}>
              <title>{o.leads != null ? `${o.name} · ${o.leads} lead${o.leads === 1 ? "" : "s"}` : o.name}</title>
            </circle>
          ))}

          {m.hubXY ? (
            <>
              <circle cx={m.hubXY[0]} cy={m.hubXY[1]} r={haloR} fill="currentColor" opacity={0.15} />
              <circle cx={m.hubXY[0]} cy={m.hubXY[1]} r={hubR} fill="currentColor" className="stroke-card" strokeWidth={2} vectorEffect="non-scaling-stroke">
                <title>{hub?.name}</title>
              </circle>
            </>
          ) : null}
        </g>
      </svg>

      {lg ? (
        <div className="mt-3 lg:mt-[0.833vw] flex flex-wrap items-center gap-4 lg:gap-[1.111vw] text-xs lg:text-[0.764vw] text-muted-foreground">
          {m.hubXY && lg.you ? (
            <span className="flex items-center gap-1.5 lg:gap-[0.417vw]"><span className="size-2.5 rounded-full bg-primary" /> {lg.you}</span>
          ) : null}
          <span className="flex items-center gap-1.5 lg:gap-[0.417vw]"><span className="size-2.5 rounded-full bg-primary/70" /> {lg.origin}</span>
        </div>
      ) : null}
    </div>
  )
}
