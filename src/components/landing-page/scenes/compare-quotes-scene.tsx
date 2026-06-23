"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Icon } from "@/components/ui/icon"
import { SceneStage, SceneAvatar, SceneCursor } from "./scene-stage"

// "Compare & pick" — three quotes line up; the homeowner's choice highlights
// with an indigo ring + "Hired", the others ease back. No pressure, you choose.

type Quote = { name: string; avatar: string; price: string; rating: string }

const QUOTES: Quote[] = [
  { name: "Marcus R.", avatar: "/avatars/pro-1.jpg", price: "$8,400", rating: "4.9" },
  { name: "Diana L.", avatar: "/avatars/pro-2.jpg", price: "$9,150", rating: "5.0" },
  { name: "Tyrese K.", avatar: "/avatars/pro-3.jpg", price: "$7,900", rating: "4.8" },
]
const PICK = 0 // Marcus — balanced price + rating

export function CompareQuotesScene() {
  const reduce = useReducedMotion()
  const [picked, setPicked] = useState(false)

  useEffect(() => {
    if (reduce) {
      setPicked(true)
      return
    }
    setPicked(false)
    const t = setTimeout(() => setPicked(true), 2400)
    return () => clearTimeout(t)
  }, [reduce])

  return (
    <SceneStage>
      <div className="relative flex w-full max-w-[340px] flex-col gap-2.5 lg:max-w-[25vw] lg:gap-[0.7vw]">
        <SceneCursor reduce={reduce} clickAt={2.4} from={{ x: 58, y: 118 }} to={{ x: 89, y: 24 }} />
        {QUOTES.map((q, i) => {
          const isPick = i === PICK
          const chosen = picked && isPick
          const dimmed = picked && !isPick
          return (
            <motion.div
              key={q.name}
              className="flex items-center gap-3 rounded-md bg-card px-3 py-2.5 lg:gap-[0.8vw] lg:rounded-[0.45vw] lg:px-[0.9vw] lg:py-[0.7vw]"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{
                opacity: dimmed ? 0.55 : 1,
                y: 0,
              }}
              transition={{ duration: 0.5, delay: reduce ? 0 : 0.2 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                boxShadow: "none",
                outline: chosen ? "2px solid #1f00ce" : "1px solid rgba(15,26,10,0.10)",
                outlineOffset: chosen ? "-2px" : "-1px",
              }}
            >
              <SceneAvatar src={q.avatar} className="size-10 lg:size-[2.9vw]" />
              <div className="flex flex-1 flex-col leading-tight">
                <span className="text-[12px] font-semibold text-foreground lg:text-[0.9vw]">
                  {q.name}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground lg:text-[0.74vw]">
                  <Icon name="star-filled" className="size-2.5 text-primary lg:size-[0.8vw]" />
                  <span className="font-semibold text-foreground">{q.rating}</span>
                  <span aria-hidden>·</span>
                  Free estimate
                </span>
              </div>
              <div className="flex flex-col items-end gap-1 lg:gap-[0.3vw]">
                <span className="text-[14px] font-bold text-foreground lg:text-[1.05vw]">
                  {q.price}
                </span>
                {chosen ? (
                  <span className="flex items-center gap-1 rounded-sm bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground lg:text-[0.68vw]">
                    <Icon name="tick" className="size-2.5 lg:size-[0.75vw]" />
                    Hired
                  </span>
                ) : (
                  <span className="rounded-sm px-1.5 py-0.5 text-[9px] font-semibold text-primary ring-1 ring-primary/25 lg:text-[0.68vw]">
                    Choose
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </SceneStage>
  )
}
