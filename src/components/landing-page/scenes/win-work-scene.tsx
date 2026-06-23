"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Icon } from "@/components/ui/icon"
import { SceneStage, SceneAvatar } from "./scene-stage"

// "Win the work" — the job is won: an accepted banner, a five-star review filling
// in, and a paid-on-completion line. The full-fee-only-when-you-win payoff.

export function WinWorkScene() {
  const reduce = useReducedMotion()
  const [stars, setStars] = useState(reduce ? 5 : 0)

  useEffect(() => {
    if (reduce) {
      setStars(5)
      return
    }
    setStars(0)
    const timers = [0, 1, 2, 3, 4].map((i) =>
      setTimeout(() => setStars((s) => Math.max(s, i + 1)), 1500 + i * 180),
    )
    return () => timers.forEach(clearTimeout)
  }, [reduce])

  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
        }

  return (
    <SceneStage>
      <div className="w-full max-w-[330px] overflow-hidden rounded-md border bg-card lg:max-w-[24vw] lg:rounded-[0.45vw]">
        {/* accepted banner */}
        <motion.div
          className="flex items-center gap-2.5 border-b px-4 py-3 lg:gap-[0.7vw] lg:px-[1.1vw] lg:py-[0.8vw]"
          {...fade(0.15)}
        >
          <motion.span
            className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground lg:size-[2.4vw] lg:rounded-[0.4vw]"
            initial={reduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.45, delay: 0.3, ease: "backOut" }}
          >
            <Icon name="tick" className="size-4 lg:size-[1.2vw]" />
          </motion.span>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold text-foreground lg:text-[0.95vw]">
              Quote accepted
            </span>
            <span className="text-[10px] text-muted-foreground lg:text-[0.74vw]">
              Marcus hired you · Roof replacement
            </span>
          </div>
          <span className="ml-auto text-[14px] font-bold text-foreground lg:text-[1.05vw]">
            $8,400
          </span>
        </motion.div>

        {/* review */}
        <motion.div className="px-4 py-3.5 lg:px-[1.1vw] lg:py-[1vw]" {...fade(0.5)}>
          <div className="flex items-center gap-2.5 lg:gap-[0.7vw]">
            <SceneAvatar src="/avatars/pro-2.jpg" className="size-8 lg:size-[2.4vw]" />
            <div className="flex flex-col">
              <div className="flex gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Icon
                    key={i}
                    name="star-filled"
                    className={
                      "size-3.5 transition-colors duration-200 lg:size-[1vw] " +
                      (i < stars ? "text-primary" : "text-foreground/15")
                    }
                  />
                ))}
              </div>
              <span className="mt-1 text-[11px] text-foreground lg:text-[0.8vw]">
                “Great crew, fast and tidy work.”
              </span>
            </div>
          </div>
        </motion.div>

        {/* paid line */}
        <motion.div
          className="flex items-center gap-2 border-t px-4 py-2.5 text-[11px] font-medium text-primary lg:gap-[0.5vw] lg:px-[1.1vw] lg:py-[0.7vw] lg:text-[0.8vw]"
          {...fade(0.8)}
        >
          <Icon name="wallet" className="size-4 lg:size-[1.1vw]" />
          Full fee charged only now — when you won the job
        </motion.div>
      </div>
    </SceneStage>
  )
}
