import { cn } from "@/lib/utils"

/**
 * A small smooth trend chart — hand-built SVG, no chart library. Colors itself
 * from `currentColor`, so set the text color on a wrapper (e.g. `text-primary`).
 * Used in KPI cards: a glanceable curve, not a precise plotted chart.
 */
export function Sparkline({
  data,
  className,
  strokeWidth = 2,
  fill = true,
}: {
  data: number[]
  className?: string
  strokeWidth?: number
  fill?: boolean
}) {
  const W = 100
  const H = 40
  const pad = 3

  if (data.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={cn("h-10 w-full", className)} aria-hidden="true" />
    )
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const span = max - min || 1
  const stepX = (W - pad * 2) / (data.length - 1)

  const pts = data.map((v, i) => {
    const x = pad + i * stepX
    // Flat series sit a little above the baseline so the card still reads as alive.
    const y = max === min ? H - pad - (H - pad * 2) * 0.25 : pad + (H - pad * 2) * (1 - (v - min) / span)
    return [x, y] as const
  })

  // Smooth the line with a light Catmull-Rom → cubic-bezier pass.
  let line = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`
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
    line += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
  }
  const area = `${line} L${pts[pts.length - 1][0].toFixed(2)},${H} L${pts[0][0].toFixed(2)},${H} Z`
  const [lastX, lastY] = pts[pts.length - 1]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("h-10 w-full overflow-visible", className)}
      aria-hidden="true"
    >
      {fill ? <path d={area} fill="currentColor" opacity={0.1} /> : null}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={2.6} fill="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
