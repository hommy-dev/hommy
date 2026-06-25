"use client"

import { motion, useReducedMotion } from "framer-motion"

import { Icon, type IconName } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

// Live "element" illustrations for the Coming Next cards — the same approach as
// the landing-page how-it-works scenes (framer-motion mini-UIs, reduced-motion
// aware) rather than static images, so they stay crisp, themeable and alive.
// Each scene fills its parent panel (the card supplies the tinted background).
// Sizing follows the platform convention: base utility on small screens, a
// vw-based variant on `lg` (px / 14.4 off a 1440 design width).

const EASE = [0.22, 1, 0.36, 1] as const

const card =
  "rounded-lg lg:rounded-[0.556vw] bg-card ring-1 ring-foreground/10 shadow-sm dark:bg-card/90"

function Tile({
  icon,
  className,
  iconClass,
}: {
  icon: IconName
  className?: string
  iconClass?: string
}) {
  return (
    <span className={cn("grid place-items-center", card, className)}>
      <Icon name={icon} className={cn("size-5 lg:size-[1.389vw]", iconClass)} />
    </span>
  )
}

// 1 — More integrations: a row of app tiles, the middle one popped forward with
// a name pill, gently bobbing (mirrors the inspiration card).
export function IntegrationsScene() {
  const reduce = useReducedMotion()
  const tiles: { icon: IconName; color: string }[] = [
    { icon: "wallet", color: "text-emerald-500" },
    { icon: "camera", color: "text-sky-500" },
    { icon: "swap", color: "text-indigo-500" },
    { icon: "send", color: "text-rose-500" },
    { icon: "calendar", color: "text-amber-500" },
  ]
  return (
    <div className="flex items-end gap-2.5 lg:gap-[0.694vw]">
      {tiles.map((t, i) => {
        const mid = i === 2
        return (
          <motion.div
            key={t.icon}
            className="relative"
            animate={reduce || !mid ? undefined : { y: [0, -7, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Tile
              icon={t.icon}
              iconClass={cn(
                mid ? "size-7 lg:size-[1.944vw]" : "size-5 lg:size-[1.389vw]",
                t.color,
              )}
              className={cn(
                "size-12 lg:size-[3.333vw] transition",
                mid ? "size-16 lg:size-[4.444vw] shadow-md" : "opacity-90",
              )}
            />
            {mid ? (
              <span className="absolute -bottom-6 lg:-bottom-[1.667vw] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md lg:rounded-[0.417vw] bg-foreground px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-[10px] lg:text-[0.694vw] font-medium text-background">
                QuickBooks
              </span>
            ) : null}
          </motion.div>
        )
      })}
    </div>
  )
}

// 2 — AI back office: action chips stream in on a loop with a "working" dot.
export function AiScene() {
  const reduce = useReducedMotion()
  const chips: { icon: IconName; text: string }[] = [
    { icon: "chat", text: "Replied to a new lead" },
    { icon: "calendar", text: "Scheduled the Tuesday crew" },
    { icon: "paper", text: "Drafted a quote" },
  ]
  return (
    <div className="w-full max-w-[17rem] lg:max-w-[18.889vw]">
      <div className="mb-2.5 lg:mb-[0.694vw] flex items-center gap-2 lg:gap-[0.556vw] px-0.5 lg:px-[0.139vw]">
        <motion.span
          className="size-2 lg:size-[0.556vw] rounded-full bg-indigo-500"
          animate={reduce ? undefined : { opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="text-[11px] lg:text-[0.764vw] font-semibold text-foreground">
          Hommy AI
        </span>
        <span className="text-[11px] lg:text-[0.764vw] text-muted-foreground">
          working…
        </span>
      </div>
      <div className="flex flex-col gap-2 lg:gap-[0.556vw]">
        {chips.map((c, i) => (
          <motion.div
            key={c.text}
            className={cn("flex items-center gap-2 lg:gap-[0.556vw] px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw]", card)}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={
              reduce ? { opacity: 1 } : { opacity: [0, 1, 1, 1], y: [8, 0, 0, 0] }
            }
            transition={{
              duration: 4,
              times: [0, 0.12, 0.9, 1],
              delay: i * 0.5,
              repeat: Infinity,
              repeatDelay: 0.6,
              ease: EASE,
            }}
          >
            <span className="grid size-5 lg:size-[1.389vw] place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Icon name="tick" className="size-3 lg:size-[0.833vw]" />
            </span>
            <span className="flex-1 text-[11px] lg:text-[0.764vw] font-medium text-foreground">
              {c.text}
            </span>
            <Icon name={c.icon} className="size-3.5 lg:size-[0.972vw] text-muted-foreground" />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// 3 — Storm detection: a radar sweep with pulsing pings + a hit counter.
export function StormScene() {
  const reduce = useReducedMotion()
  const pings = [
    { top: "28%", left: "62%", d: 0 },
    { top: "60%", left: "38%", d: 0.6 },
    { top: "44%", left: "72%", d: 1.2 },
  ]
  return (
    <div className="relative grid size-40 lg:size-[11.111vw] place-items-center">
      {[0, 1, 2].map((r) => (
        <span
          key={r}
          className="absolute rounded-full ring-1 ring-amber-500/25"
          style={{ width: `${40 + r * 30}%`, height: `${40 + r * 30}%` }}
        />
      ))}
      {/* sweep */}
      <motion.span
        className="absolute size-full rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(245,158,11,0.35), rgba(245,158,11,0) 90deg)",
        }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      {pings.map((p) => (
        <motion.span
          key={`${p.top}-${p.left}`}
          className="absolute size-2 lg:size-[0.556vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500"
          style={{ top: p.top, left: p.left }}
          animate={reduce ? undefined : { scale: [1, 1.8, 1], opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: p.d, ease: "easeInOut" }}
        />
      ))}
      <span className="absolute -bottom-2 lg:-bottom-[0.556vw] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md lg:rounded-[0.417vw] bg-card px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-[10px] lg:text-[0.694vw] font-semibold text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
        14 homes hit
      </span>
    </div>
  )
}

// 4 — Crew management: a lead chip slides onto a crew member (loop).
export function CrewScene() {
  const reduce = useReducedMotion()
  const crew = [
    { name: "JM", color: "bg-emerald-500" },
    { name: "TR", color: "bg-sky-500" },
    { name: "AL", color: "bg-indigo-500" },
  ]
  return (
    <div className="flex items-center gap-4 lg:gap-[1.111vw]">
      <div className="flex flex-col gap-1.5 lg:gap-[0.417vw]">
        {crew.map((c, i) => (
          <div key={c.name} className="flex items-center gap-2 lg:gap-[0.556vw]">
            <span
              className={cn(
                "grid size-9 lg:size-[2.5vw] place-items-center rounded-full text-[11px] lg:text-[0.764vw] font-bold text-white",
                c.color,
              )}
            >
              {c.name}
            </span>
            {i === 0 ? (
              <motion.span
                className="grid size-5 lg:size-[1.389vw] place-items-center rounded-full bg-emerald-500/15 text-emerald-500"
                initial={reduce ? false : { scale: 0, opacity: 0 }}
                animate={reduce ? { opacity: 1 } : { scale: [0, 0, 1, 1, 0], opacity: [0, 0, 1, 1, 0] }}
                transition={{ duration: 3.2, times: [0, 0.4, 0.5, 0.9, 1], repeat: Infinity, ease: EASE }}
              >
                <Icon name="tick" className="size-3 lg:size-[0.833vw]" />
              </motion.span>
            ) : null}
          </div>
        ))}
      </div>
      <motion.div
        className={cn("flex items-center gap-1.5 lg:gap-[0.417vw] px-2.5 lg:px-[0.694vw] py-1.5 lg:py-[0.417vw]", card)}
        animate={reduce ? undefined : { x: [40, 0, 0, 0], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 3.2, times: [0, 0.4, 0.85, 1], repeat: Infinity, ease: EASE }}
      >
        <Icon name="home" className="size-3.5 lg:size-[0.972vw] text-indigo-500" />
        <span className="text-[10px] lg:text-[0.694vw] font-semibold text-foreground">New lead</span>
      </motion.div>
    </div>
  )
}

// 5 — Social manager: a post slides into a "Scheduled" slot; platforms below.
export function SocialScene() {
  const reduce = useReducedMotion()
  const platforms: { icon: IconName; color: string }[] = [
    { icon: "camera", color: "text-rose-500" },
    { icon: "chat", color: "text-sky-500" },
    { icon: "star", color: "text-amber-500" },
  ]
  return (
    <div className="flex w-full max-w-[15rem] lg:max-w-[16.667vw] flex-col items-center gap-3 lg:gap-[0.833vw]">
      <motion.div
        className={cn("flex w-full items-center gap-2 lg:gap-[0.556vw] px-2.5 lg:px-[0.694vw] py-2 lg:py-[0.556vw]", card)}
        animate={reduce ? undefined : { y: [10, 0, 0], opacity: [0, 1, 1] }}
        transition={{ duration: 3, times: [0, 0.25, 1], repeat: Infinity, repeatDelay: 0.4, ease: EASE }}
      >
        <span className="grid size-7 lg:size-[1.944vw] place-items-center rounded-md lg:rounded-[0.417vw] bg-rose-500/15 text-rose-500">
          <Icon name="image" className="size-4 lg:size-[1.111vw]" />
        </span>
        <div className="flex-1">
          <div className="h-1.5 lg:h-[0.417vw] w-3/4 rounded-full bg-foreground/15" />
          <div className="mt-1 lg:mt-[0.278vw] h-1.5 lg:h-[0.417vw] w-1/2 rounded-full bg-foreground/10" />
        </div>
        <span className="rounded-md lg:rounded-[0.417vw] bg-emerald-500/15 px-1.5 lg:px-[0.417vw] py-0.5 lg:py-[0.139vw] text-[9px] lg:text-[0.625vw] font-semibold text-emerald-600 dark:text-emerald-400">
          Scheduled
        </span>
      </motion.div>
      <div className="flex items-center gap-2 lg:gap-[0.556vw]">
        {platforms.map((p) => (
          <Tile
            key={p.icon}
            icon={p.icon}
            iconClass={cn("size-4 lg:size-[1.111vw]", p.color)}
            className="size-10 lg:size-[2.778vw]"
          />
        ))}
      </div>
    </div>
  )
}

// 6 — Teaser: a calm plus motif with radiating sparkle dots.
export function MoreScene() {
  const reduce = useReducedMotion()
  return (
    <div className="relative grid size-32 lg:size-[8.889vw] place-items-center">
      {[0, 1, 2].map((r) => (
        <motion.span
          key={r}
          className="absolute rounded-full ring-1 ring-indigo-500/20"
          style={{ width: `${45 + r * 28}%`, height: `${45 + r * 28}%` }}
          animate={reduce ? undefined : { opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: r * 0.4, ease: "easeInOut" }}
        />
      ))}
      <span className="grid size-16 lg:size-[4.444vw] place-items-center rounded-xl lg:rounded-[0.833vw] bg-indigo-500/15 text-indigo-500 ring-1 ring-indigo-500/20">
        <Icon name="plus" className="size-8 lg:size-[2.222vw]" />
      </span>
    </div>
  )
}

export const SCENES: Record<string, () => React.ReactElement> = {
  "ai-assistant": AiScene,
  "storm-detection": StormScene,
  "crew-management": CrewScene,
  integrations: IntegrationsScene,
  "social-media": SocialScene,
  more: MoreScene,
}
