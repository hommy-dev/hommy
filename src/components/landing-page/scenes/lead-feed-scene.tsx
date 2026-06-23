"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Icon, type IconName } from "@/components/ui/icon"
import { SceneStage } from "./scene-stage"

// "Get matched leads" — nearby jobs drop into the roofer's feed one by one,
// each tagged with location, roof type and a freshness cue. Free to look.

type Lead = {
  title: string
  place: string
  meta: string
  icon: IconName
  fresh?: boolean
}

const LEADS: Lead[] = [
  { title: "Roof replacement", place: "Austin, TX", meta: "Asphalt · ~$8k · 5m ago", icon: "home", fresh: true },
  { title: "Leak repair", place: "Round Rock, TX", meta: "Flat roof · Urgent · 12m ago", icon: "wrench", fresh: true },
  { title: "Full inspection", place: "Cedar Park, TX", meta: "Tile · 1h ago", icon: "search" },
]

export function LeadFeedScene() {
  const reduce = useReducedMotion()

  return (
    <SceneStage>
      <div className="flex w-full max-w-[340px] flex-col gap-2.5 lg:max-w-[25vw] lg:gap-[0.7vw]">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[12px] font-semibold text-foreground lg:text-[0.9vw]">
            Leads near you
          </span>
          <span className="flex items-center gap-1 rounded-sm bg-primary/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/15 lg:text-[0.72vw]">
            <Icon name="location" className="size-3 lg:size-[0.85vw]" />
            Austin, TX
          </span>
        </div>

        {LEADS.map((l, i) => (
          <motion.div
            key={l.title}
            className="flex items-center gap-3 rounded-md bg-card px-3 py-2.5 ring-1 ring-foreground/10 lg:gap-[0.8vw] lg:rounded-[0.45vw] lg:px-[0.9vw] lg:py-[0.7vw]"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.3 + i * 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/[0.07] text-primary lg:size-[2.6vw] lg:rounded-[0.4vw]">
              <Icon name={l.icon} className="size-4 lg:size-[1.2vw]" />
            </span>
            <div className="flex flex-1 flex-col leading-tight">
              <span className="flex items-center gap-2 text-[12px] font-semibold text-foreground lg:text-[0.9vw]">
                {l.title}
                <span className="text-muted-foreground">· {l.place}</span>
              </span>
              <span className="mt-0.5 text-[10px] text-muted-foreground lg:text-[0.74vw]">
                {l.meta}
              </span>
            </div>
            {l.fresh ? (
              <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground lg:text-[0.68vw]">
                New
              </span>
            ) : null}
          </motion.div>
        ))}
      </div>
    </SceneStage>
  )
}
