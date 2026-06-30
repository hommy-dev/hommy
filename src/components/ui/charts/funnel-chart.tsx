"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { BG, type ChartColor } from "./palette"

export type FunnelStage = { label: string; value: number; color?: ChartColor }

const EASE = [0.23, 1, 0.32, 1] as const

/**
 * A vertical funnel: stages top→bottom, each a horizontal bar whose width is the
 * stage's share of the first (widest) stage. Drop-off % from the previous stage
 * is shown on every row after the first. Bars reveal left→right on mount.
 */
export function FunnelChart({ stages, className }: { stages: FunnelStage[]; className?: string }) {
  const reduce = useReducedMotion()
  const top = stages[0]?.value || 1

  return (
    <div className={cn("space-y-2.5 lg:space-y-[0.694vw]", className)}>
      {stages.map((s, i) => {
        const widthPct = Math.max(s.value > 0 ? 8 : 4, Math.round((s.value / top) * 100))
        const prev = i > 0 ? stages[i - 1].value : null
        const drop = prev && prev > 0 ? Math.round(((prev - s.value) / prev) * 100) : null
        return (
          <div key={s.label} className="space-y-1 lg:space-y-[0.278vw]">
            <div className="flex items-baseline justify-between gap-2 lg:gap-[0.556vw] text-sm lg:text-[0.903vw]">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex items-baseline gap-2 lg:gap-[0.556vw]">
                {drop != null ? (
                  <span
                    className={cn(
                      "text-xs lg:text-[0.764vw] tabular-nums",
                      drop > 50 ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    −{drop}%
                  </span>
                ) : null}
                <span className="font-semibold tabular-nums text-foreground">
                  {s.value.toLocaleString()}
                </span>
              </span>
            </div>
            <div className="h-7 lg:h-[1.944vw] w-full overflow-hidden rounded-md lg:rounded-[0.417vw] bg-muted/40">
              <motion.div
                className={cn("h-full rounded-md lg:rounded-[0.417vw] opacity-90", BG[s.color ?? "primary"])}
                style={{ width: `${widthPct}%`, transformOrigin: "left" }}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: EASE, delay: reduce ? 0 : i * 0.08 }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
