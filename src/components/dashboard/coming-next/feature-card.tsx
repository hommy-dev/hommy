"use client"

import { useState, useTransition } from "react"
import { motion, useReducedMotion } from "framer-motion"

import { toggleFeatureInterest } from "@/lib/actions/feature-interest"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { showToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { type FeatureDef } from "./features"
import { SCENES } from "./scenes"

// Panel tint follows the feature's accent.
const ACCENT_PANEL: Record<FeatureDef["accent"], string> = {
  indigo: "from-indigo-500/12",
  amber: "from-amber-500/12",
  sky: "from-sky-500/12",
  emerald: "from-emerald-500/12",
  rose: "from-rose-500/12",
}

export function FeatureCard({
  feature,
  voted: initialVoted,
}: {
  feature: FeatureDef
  voted: boolean
}) {
  const reduce = useReducedMotion()
  const [voted, setVoted] = useState(initialVoted)
  const [pending, start] = useTransition()
  const Scene = SCENES[feature.key]

  function onToggle() {
    const next = !voted
    // Optimistic: flip immediately, reconcile with server truth (or revert).
    setVoted(next)
    start(async () => {
      const res = await toggleFeatureInterest(feature.key)
      if (!res.success) {
        setVoted(!next)
        showToast("Could not save that", { type: "error", description: res.error })
        return
      }
      setVoted(res.data.voted)
    })
  }

  return (
    <motion.div
      className="group flex flex-col overflow-hidden rounded-xl lg:rounded-[0.833vw] border border-border bg-card transition-colors hover:border-foreground/25"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={cn(
          "relative grid h-56 lg:h-[15.556vw] place-items-center overflow-hidden bg-gradient-to-b to-transparent",
          ACCENT_PANEL[feature.accent],
        )}
      >
        {Scene ? (
          <Scene />
        ) : (
          <Icon name={feature.icon} className="size-12 lg:size-[3.333vw] text-muted-foreground" />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 lg:p-[1.389vw]">
        <h3 className="font-sebenta text-base lg:text-[1.25vw] font-bold tracking-tight">
          {feature.title}
        </h3>
        <p className="mt-1 lg:mt-[0.278vw] flex-1 text-sm lg:text-[0.972vw] leading-relaxed text-muted-foreground">
          {feature.description}
        </p>

        {feature.votable ? (
          <Button
            type="button"
            onClick={onToggle}
            disabled={pending}
            aria-pressed={voted}
            variant={voted ? "surface" : "outline"}
            className="mt-5 lg:mt-[1.389vw] w-full"
          >
            <Icon
              name={voted ? "tick" : "notification"}
              className="size-4 lg:size-[1.111vw]"
            />
            {voted ? "We'll notify you" : "Notify me"}
          </Button>
        ) : (
          <div className="mt-5 lg:mt-[1.389vw] flex items-center gap-1.5 lg:gap-[0.417vw] text-xs lg:text-[0.833vw] font-medium text-muted-foreground">
            <Icon name="message" className="size-3.5 lg:size-[0.972vw]" />
            Got an idea? Tell us in Messages.
          </div>
        )}
      </div>
    </motion.div>
  )
}
