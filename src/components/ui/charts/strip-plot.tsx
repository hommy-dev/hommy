import { cn } from "@/lib/utils"

export type StripPoint = { score: number; isSelf: boolean }

/**
 * A 1-D number line: every company is a dot placed on a shared score axis, so you
 * can see your position AND the spread of the field at once. You are the bright
 * primary dot; peers are muted; the area average is a dashed tick. Works the same
 * with 2 companies or 50.
 */
export function StripPlot({
  points,
  average,
  className,
}: {
  points: StripPoint[]
  average: number
  className?: string
}) {
  const scores = points.map((p) => p.score)
  const hi = Math.max(...scores, average)
  const lo = Math.min(...scores, average)
  const pad = Math.max(3, (hi - lo) * 0.15)
  const max = hi + pad
  const min = Math.max(0, lo - pad)
  const span = max - min || 1

  // Inset so edge dots and their labels never touch the card border.
  const INSET = 7
  const xPct = (v: number) => INSET + ((v - min) / span) * (100 - 2 * INSET)

  const self = points.find((p) => p.isSelf)
  const selfX = self ? xPct(self.score) : null
  const labelX = selfX != null ? Math.min(88, Math.max(12, selfX)) : null
  const avgX = xPct(average)

  return (
    <div className={className}>
      <div className="relative h-24 lg:h-[6.5vw]">
        {/* Axis line */}
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-muted" />

        {/* Area-average tick */}
        <div className="absolute top-[24%] bottom-[24%] border-l border-dashed border-muted-foreground/60" style={{ left: `${avgX}%` }} />
        <span className="absolute bottom-1 lg:bottom-[0.278vw] -translate-x-1/2 whitespace-nowrap text-[10px] lg:text-[0.694vw] tabular-nums text-muted-foreground" style={{ left: `${avgX}%` }}>
          avg {Math.round(average)}
        </span>

        {/* Peer dots */}
        {points.map((p, i) =>
          p.isSelf ? null : (
            <span
              key={i}
              className="absolute top-1/2 size-2.5 lg:size-[0.694vw] -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-muted-foreground/55"
              style={{ left: `${xPct(p.score)}%` }}
              title={`Roofer in your area · ${p.score}`}
            />
          ),
        )}

        {/* You */}
        {self && selfX != null && labelX != null ? (
          <>
            <span
              className="absolute top-[6%] -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-[10px] lg:text-[0.694vw] font-semibold text-primary-foreground"
              style={{ left: `${labelX}%` }}
            >
              You · {self.score}
            </span>
            <span
              className="absolute top-1/2 size-4 lg:size-[1.111vw] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20"
              style={{ left: `${selfX}%` }}
            />
          </>
        ) : null}
      </div>

      {/* Axis end labels */}
      <div className="flex justify-between text-[10px] lg:text-[0.694vw] tabular-nums text-muted-foreground">
        <span>{Math.round(min)}</span>
        <span>{Math.round(max)}</span>
      </div>
    </div>
  )
}
