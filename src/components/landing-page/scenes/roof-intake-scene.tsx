"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Icon } from "@/components/ui/icon"
import { SceneStage, SceneCursor } from "./scene-stage"

// "Tell us about your roof" — a mini intake card whose rows fill in, then the
// footer flips from "Get free quotes" to "Sent to local pros". Calm + on-system.

const ROWS = [
  { icon: "location" as const, label: "Location", value: "Austin, TX 78701" },
  { icon: "calendar" as const, label: "Timeline", value: "Within 2 weeks" },
]
const ISSUES = ["Active leak", "Missing shingles"]

export function RoofIntakeScene() {
  const reduce = useReducedMotion()
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (reduce) {
      setSent(true)
      return
    }
    setSent(false)
    const t = setTimeout(() => setSent(true), 2600)
    return () => clearTimeout(t)
  }, [reduce])

  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
        }

  return (
    <SceneStage>
      <div className="relative w-full max-w-[330px] rounded-md border bg-card lg:max-w-[24vw] lg:rounded-[0.45vw]">
        <SceneCursor reduce={reduce} clickAt={2.6} from={{ x: 86, y: 122 }} to={{ x: 50, y: 90 }} />
        {/* header */}
        <div className="flex items-center gap-2.5 border-b px-4 py-3 lg:gap-[0.7vw] lg:px-[1.1vw] lg:py-[0.8vw]">
          <span
            className="flex size-8 items-center justify-center rounded-md text-primary-foreground lg:size-[2.4vw] lg:rounded-[0.4vw]"
            style={{ backgroundImage: "linear-gradient(150deg, #3a1ee0, #1f00ce)" }}
          >
            <Icon name="home" className="size-4 lg:size-[1.2vw]" />
          </span>
          <span className="flex-1 text-[13px] font-semibold text-foreground lg:text-[0.95vw]">
            New roof request
          </span>
          <span className="flex items-center gap-1 rounded-sm bg-primary/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/15 lg:text-[0.72vw]">
            <Icon name="time-circle" className="size-3 lg:size-[0.85vw]" />
            ~2 min
          </span>
        </div>

        {/* body */}
        <div className="flex flex-col gap-3 px-4 py-3.5 lg:gap-[0.9vw] lg:px-[1.1vw] lg:py-[1vw]">
          {ROWS.map((r, i) => (
            <motion.div
              key={r.label}
              className="flex items-center gap-2.5 lg:gap-[0.7vw]"
              {...fade(0.2 + i * 0.25)}
            >
              <Icon name={r.icon} className="size-4 text-primary lg:size-[1.15vw]" />
              <span className="w-16 text-[11px] text-muted-foreground lg:w-[5.5vw] lg:text-[0.78vw]">
                {r.label}
              </span>
              <span className="text-[12px] font-medium text-foreground lg:text-[0.85vw]">
                {r.value}
              </span>
            </motion.div>
          ))}

          <motion.div
            className="flex items-center gap-2.5 lg:gap-[0.7vw]"
            {...fade(0.7)}
          >
            <Icon name="wrench" className="size-4 text-primary lg:size-[1.15vw]" />
            <span className="w-16 text-[11px] text-muted-foreground lg:w-[5.5vw] lg:text-[0.78vw]">
              Problem
            </span>
            <span className="flex flex-wrap gap-1.5 lg:gap-[0.4vw]">
              {ISSUES.map((t, i) => (
                <motion.span
                  key={t}
                  className="rounded-sm bg-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-foreground ring-1 ring-foreground/10 lg:text-[0.72vw]"
                  {...(reduce
                    ? {}
                    : {
                        initial: { opacity: 0, scale: 0.85 },
                        animate: { opacity: 1, scale: 1 },
                        transition: { duration: 0.35, delay: 0.95 + i * 0.18 },
                      })}
                >
                  {t}
                </motion.span>
              ))}
            </span>
          </motion.div>
        </div>

        {/* footer action */}
        <div className="border-t p-3 lg:p-[0.8vw]">
          <motion.div
            className="flex items-center justify-center gap-2 rounded-md py-2.5 text-[12px] font-semibold lg:gap-[0.5vw] lg:rounded-[0.4vw] lg:py-[0.7vw] lg:text-[0.85vw]"
            animate={{
              backgroundColor: sent ? "rgba(31,0,206,0.06)" : "#1f00ce",
              color: sent ? "#1f00ce" : "#ffffff",
            }}
            transition={{ duration: 0.4 }}
          >
            {sent ? (
              <>
                <Icon name="tick" className="size-4 lg:size-[1.1vw]" />
                Sent to 6 local pros
              </>
            ) : (
              <>
                <Icon name="send" className="size-4 lg:size-[1.1vw]" />
                Get my free quotes
              </>
            )}
          </motion.div>
        </div>
      </div>
    </SceneStage>
  )
}
