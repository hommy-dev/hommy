"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

// Live "Respond in 5h 12m" countdown to a lead offer's SLA deadline. Speed-to-
// lead is the core promise, so this is front-and-centre and turns red as time
// runs low. Mounted-gated to avoid a hydration mismatch on the time.
export function SlaCountdown({
  deadline,
  className,
  compact = false,
}: {
  deadline: Date
  className?: string
  /** Show just the duration ("5h 12m") instead of "Respond in 5h 12m". */
  compact?: boolean
}) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    // Mounted-gate: set the clock on the client only (avoids SSR hydration
    // mismatch on the live time), then tick.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const ms = now === null ? null : new Date(deadline).getTime() - now
  const urgent = ms !== null && ms > 0 && ms < 2 * 3_600_000

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 lg:gap-[0.278vw] tabular-nums",
        ms !== null && ms <= 0
          ? "text-muted-foreground"
          : urgent
            ? "font-medium text-red-600 dark:text-red-400"
            : "text-muted-foreground",
        className,
      )}
    >
      <ClockIcon />
      {ms === null
        ? "—"
        : ms <= 0
          ? compact
            ? "Past due"
            : "Response overdue"
          : compact
            ? formatLeft(ms)
            : `Respond in ${formatLeft(ms)}`}
    </span>
  )
}

function formatLeft(ms: number): string {
  const mins = Math.floor(ms / 60_000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return h >= 1 ? `${h}h ${m}m` : `${m}m`
}

function ClockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="lg:size-[0.833vw]"
    >
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 4.75V8l2.25 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
