"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

// Shared frame for the How-it-works illustration scenes. Matches the design
// system: a bordered `bg-background` panel, no drop shadow, content centered.
// Each scene drops its composition inside.

export function SceneStage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className="absolute inset-0 overflow-hidden border bg-background">
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center p-5 lg:p-[2vw]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

// Filled colour hand cursor (public/icons/mouse-hand-cursor-color-icon.svg).
// Rendered as an <img> so its multi-colour fills are preserved. The fingertip is
// the hotspot, so the glyph is nudged up-left to sit under the container origin.
function CursorIcon() {
  return (
    <span className="block -translate-x-[9px] -translate-y-[2px] lg:-translate-x-[0.64vw] lg:-translate-y-[0.5vw]">
      {/* eslint-disable-next-line @next/next/no-img-element -- inline cursor glyph in a landing illustration */}
      <img
        src="/icons/mouse-hand-cursor-color-icon.svg"
        alt=""
        className="block h-7 w-6 lg:h-[1.95vw] lg:w-[1.65vw]"
      />
    </span>
  )
}

// Cinematic easings (not linear): a swooping glide that decelerates into the
// target, and a snappy press for the click pinch.
const GLIDE = [0.16, 1, 0.3, 1] as const // expo-out: quick start, soft landing
const PRESS = [0.34, 1.4, 0.64, 1] as const // slight overshoot on release

/**
 * A faux hand pointer that glides along an eased arc from `from` to `to`
 * (percentages of the nearest positioned ancestor) and "clicks" at `clickAt`
 * seconds — a press pinch plus a circular ripple — so an action scene reads like
 * a screen recording. Place inside a `relative` container holding the button it
 * should land on. Renders nothing under reduced motion.
 */
export function SceneCursor({
  to,
  from = { x: 92, y: 130 },
  clickAt,
  reduce,
}: {
  to: { x: number; y: number }
  from?: { x: number; y: number }
  clickAt: number
  reduce: boolean | null
}) {
  if (reduce) return null
  const total = clickAt + 0.5
  const tMid = (clickAt * 0.5) / total
  const tArrive = (clickAt - 0.08) / total
  const tDown = clickAt / total
  const tUp = (clickAt + 0.12) / total

  // Arc control point: midway along, bowed upward so the path swoops in.
  const midX = from.x + (to.x - from.x) * 0.5
  const midY = from.y + (to.y - from.y) * 0.5 - 16

  return (
    <>
      {/* circular click ripple over the target */}
      <motion.span
        className="pointer-events-none absolute z-10 size-[30px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-primary lg:size-[2.08vw]"
        style={{ left: `${to.x}%`, top: `${to.y}%` }}
        initial={{ opacity: 0, scale: 0.35 }}
        animate={{ opacity: [0, 0.55, 0], scale: [0.35, 1.5, 1.85] }}
        transition={{ duration: 0.6, delay: clickAt, ease: "easeOut" }}
      />
      {/* hand pointer */}
      <motion.div
        className="pointer-events-none absolute z-20"
        style={{ originX: 0, originY: 0 }}
        initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 0, scale: 1 }}
        animate={{
          left: [`${from.x}%`, `${midX}%`, `${to.x}%`, `${to.x}%`, `${to.x}%`, `${to.x}%`],
          top: [`${from.y}%`, `${midY}%`, `${to.y}%`, `${to.y}%`, `${to.y}%`, `${to.y}%`],
          opacity: [0, 1, 1, 1, 1, 1],
          scale: [1, 1, 1, 0.78, 1, 1],
        }}
        transition={{
          duration: total,
          times: [0, tMid, tArrive, tDown, tUp, 1],
          ease: ["easeOut", GLIDE, "linear", PRESS, "linear"],
        }}
      >
        <CursorIcon />
      </motion.div>
    </>
  )
}

/** Small rounded avatar (img, not next/image) used across the scenes. */
export function SceneAvatar({
  src,
  className,
}: {
  src: string
  className?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny decorative avatar in a landing illustration
    <img
      src={src}
      alt=""
      className={cn(
        "shrink-0 rounded-md object-cover ring-1 ring-foreground/10",
        className,
      )}
    />
  )
}
