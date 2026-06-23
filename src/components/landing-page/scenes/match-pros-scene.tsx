"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Icon, type IconName } from "@/components/ui/icon"

// "We match local pros" — a calm connection scene. A "you" marker on the left
// links out to a few nearby contractors; the connectors draw in slowly, each
// real-photo pro card lands with rating + distance + a trust tag, and a status
// pill flips to "matched". Replaces the stock photo in the How-it-works panel.
//
// Design-system rules: no drop shadows (use `ring-1 ring-foreground/10` for
// edges), no fully-rounded shapes (use rounded-md/lg), bg-card surfaces.

type Pro = {
  name: string
  avatar: string
  rating: string
  reviews: string
  dist: string
  tag: string
  tagIcon: IconName
}

const PROS: Pro[] = [
  { name: "Marcus R.", avatar: "/avatars/pro-1.jpg", rating: "4.9", reviews: "128", dist: "2.4 mi", tag: "Licensed", tagIcon: "shield-done" },
  { name: "Diana L.", avatar: "/avatars/pro-2.jpg", rating: "5.0", reviews: "86", dist: "3.1 mi", tag: "Insured", tagIcon: "badge-check" },
  { name: "Tyrese K.", avatar: "/avatars/pro-3.jpg", rating: "4.8", reviews: "203", dist: "1.7 mi", tag: "Top rated", tagIcon: "star-filled" },
]

// HTML nodes are positioned with percentages mapped onto this SVG viewBox so the
// connectors join each card precisely at any size.
const VB = { w: 320, h: 200 }
const YOU = { x: 52, y: 100 }
const ANCHOR_X = 156
const PRO_Y = [44, 100, 156]
const pct = (v: number, total: number) => `${(v / total) * 100}%`

// Calm, deliberate timing (seconds).
const DRAW_DUR = 1.1
const STAGGER = 0.34
const CARD_DELAY = 0.55

export function MatchProsScene() {
  const reduce = useReducedMotion()
  const [matched, setMatched] = useState(false)

  useEffect(() => {
    if (reduce) {
      setMatched(true)
      return
    }
    setMatched(false)
    const t = setTimeout(() => setMatched(true), 2700)
    return () => clearTimeout(t)
  }, [reduce])

  return (
    <div className="absolute inset-0 overflow-hidden bg-canvas">
      {/* dotted backdrop + faint brand wash under the "you" marker */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, var(--border) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="absolute left-[18%] top-1/2 aspect-square h-[58%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-primary/[0.07] blur-3xl" />

      {/* fixed-aspect stage shared by the SVG connectors and the HTML cards */}
      <div className="absolute inset-0 flex items-center justify-center border bg-background">
        <div className="relative aspect-[16/10] h-[84%] max-w-[94%]">
          {/* connectors */}
          <svg
            viewBox={`0 0 ${VB.w} ${VB.h}`}
            className="absolute inset-0 h-full w-full text-primary"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
          >
            {PRO_Y.map((y, i) => (
              <motion.path
                key={i}
                d={`M ${YOU.x} ${YOU.y} C ${YOU.x + 56} ${YOU.y}, ${ANCHOR_X - 48} ${y}, ${ANCHOR_X} ${y}`}
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeOpacity={0.4}
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: DRAW_DUR, delay: 0.45 + i * STAGGER, ease: "easeInOut" }}
              />
            ))}
          </svg>

          {/* "you" marker — a clean rounded node, not a circle, not a box-shadow */}
          <motion.div
            className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
            style={{ left: pct(YOU.x, VB.w), top: pct(YOU.y, VB.h) }}
            initial={reduce ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "backOut" }}
          >
            <div className="relative">
              {!reduce ? (
                <motion.span
                  className="pointer-events-none absolute inset-0 rounded-xl bg-primary/20 lg:rounded-[0.85vw]"
                  animate={{ scale: [1, 1.55], opacity: [0.5, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
                />
              ) : null}
              <div
                className="relative flex size-14 items-center justify-center rounded-xl text-primary-foreground ring-1 ring-primary/20 lg:size-[3.5vw] lg:rounded-[0.85vw]"
                style={{ backgroundImage: "linear-gradient(150deg, #3a1ee0, #1f00ce)" }}
              >
                <Icon name="home" className="size-6 lg:size-[2vw]" />
              </div>
            </div>
           
          </motion.div>

          {/* pro cards — real photo + rating, reviews, distance, trust tag */}
          {PROS.map((p, i) => (
            <motion.div
              key={p.name}
              className="absolute flex -translate-y-1/2 items-center gap-2.5 rounded-md bg-card px-2.5 py-2 ring-1 ring-foreground/10 lg:gap-[0.7vw] lg:rounded-[0.45vw] lg:px-[0.75vw] lg:py-[0.55vw]"
              style={{ left: pct(ANCHOR_X, VB.w), top: pct(PRO_Y[i], VB.h) }}
              initial={reduce ? false : { opacity: 0, scale: 0.92, x: 16 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.55, delay: CARD_DELAY + i * STAGGER, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny decorative avatar in a landing illustration */}
                <img
                  src={p.avatar}
                  alt=""
                  className="size-11 rounded-md object-cover lg:size-[3.1vw] lg:rounded-[0.4vw]"
                />
                <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-sm bg-primary text-primary-foreground ring-2 ring-card lg:size-[1.2vw]">
                  <Icon name="tick" className="size-2.5 lg:size-[0.8vw]" />
                </span>
              </div>
              <div className="flex flex-col gap-0.5 pr-1 leading-tight">
                <span className="text-[12px] font-semibold text-foreground lg:text-[0.9vw]">
                  {p.name}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground lg:text-[0.74vw]">
                  <Icon name="star-filled" className="size-2.5 text-primary lg:size-[0.8vw]" />
                  <span className="font-semibold text-foreground">{p.rating}</span>
                  <span>({p.reviews})</span>
                  <span aria-hidden>·</span>
                  <span>{p.dist}</span>
                </span>
                <span className="mt-0.5 flex w-fit items-center gap-1 rounded-sm bg-primary/[0.06] px-1.5 py-0.5 text-[9px] font-medium text-primary ring-1 ring-primary/15 lg:text-[0.68vw]">
                  <Icon name={p.tagIcon} className="size-2.5 lg:size-[0.8vw]" />
                  {p.tag}
                </span>
              </div>
            </motion.div>
          ))}

        </div>
      </div>
    </div>
  )
}
