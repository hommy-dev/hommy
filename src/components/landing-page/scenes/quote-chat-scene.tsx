"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Icon } from "@/components/ui/icon"
import { SceneStage, SceneAvatar, SceneCursor } from "./scene-stage"

// "Message the ones you want" — a short chat thread ending in a quote card that
// the homeowner accepts. Mirrors the in-app messaging quote-card meta.

export function QuoteChatScene() {
  const reduce = useReducedMotion()
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seed final state (also covers reduced-motion resolving after mount)
      setAccepted(true)
      return
    }
    setAccepted(false)
    const t = setTimeout(() => setAccepted(true), 2900)
    return () => clearTimeout(t)
  }, [reduce])

  const bubble = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10, scale: 0.96 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const },
        }

  return (
    <SceneStage>
      <div className="relative flex w-full max-w-[330px] flex-col gap-2.5 lg:max-w-[24vw] lg:gap-[0.7vw]">
        <SceneCursor reduce={reduce} clickAt={2.9} from={{ x: 24, y: 120 }} to={{ x: 59, y: 92 }} />
        {/* homeowner message */}
        <motion.div className="flex items-end gap-2 lg:gap-[0.55vw]" {...bubble(0.2)}>
          <SceneAvatar src="/avatars/pro-2.jpg" className="size-7 lg:size-[2vw]" />
          <span className="max-w-[78%] rounded-md rounded-bl-sm bg-secondary/40 px-3 py-2 text-[11px] text-foreground ring-1 ring-foreground/10 lg:rounded-[0.45vw] lg:px-[0.8vw] lg:py-[0.55vw] lg:text-[0.8vw]">
            Can you start next week?
          </span>
        </motion.div>

        {/* roofer reply */}
        <motion.div className="flex justify-end" {...bubble(0.7)}>
          <span
            className="max-w-[78%] rounded-md rounded-br-sm px-3 py-2 text-[11px] text-primary-foreground lg:rounded-[0.45vw] lg:px-[0.8vw] lg:py-[0.55vw] lg:text-[0.8vw]"
            style={{ backgroundColor: "#1f00ce" }}
          >
            Absolutely — here&apos;s my quote 👇
          </span>
        </motion.div>

        {/* quote card */}
        <motion.div
          className="self-end overflow-hidden rounded-md border bg-card lg:rounded-[0.45vw]"
          style={{ width: "82%" }}
          {...bubble(1.2)}
        >
          <div className="flex items-center justify-between border-b px-3 py-2 lg:px-[0.8vw] lg:py-[0.55vw]">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground lg:gap-[0.4vw] lg:text-[0.82vw]">
              <Icon name="document" className="size-3.5 text-primary lg:size-[1vw]" />
              Quote
            </span>
            <span className="text-[13px] font-bold text-foreground lg:text-[0.95vw]">
              $8,400
            </span>
          </div>
          <div className="px-3 py-2 lg:px-[0.8vw] lg:py-[0.55vw]">
            <span className="text-[10px] text-muted-foreground lg:text-[0.74vw]">
              Full roof replacement · Asphalt · 3–4 days
            </span>
            <motion.div
              className="mt-2 flex items-center justify-center gap-1.5 rounded-sm py-1.5 text-[11px] font-semibold lg:mt-[0.6vw] lg:py-[0.5vw] lg:text-[0.8vw]"
              animate={{
                backgroundColor: accepted ? "rgba(31,0,206,0.06)" : "#1f00ce",
                color: accepted ? "#1f00ce" : "#ffffff",
              }}
              transition={{ duration: 0.4 }}
            >
              {accepted ? (
                <>
                  <Icon name="tick" className="size-3.5 lg:size-[1vw]" />
                  Accepted
                </>
              ) : (
                "Accept quote"
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </SceneStage>
  )
}
