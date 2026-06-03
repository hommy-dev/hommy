import Link from "next/link"
import { cn } from "@/lib/utils"

export type NoticeTone = "info" | "warning" | "success" | "announcement"

type ToneStyle = {
  /** Card surface — soft gradient so the notice reads as a distinct, inviting block. */
  card: string
  /** Foreground text on the soft surface. */
  text: string
  /** Faded body copy. */
  body: string
  /** Filled CTA pill — the single thing we want clicked. */
  cta: string
}

/**
 * Soft, type-coded palettes. The notice is the only splash of saturated color
 * in an otherwise neutral sidebar, so whenever one is shown the eye is pulled
 * straight to it — and to its action button.
 */
const TONES: Record<NoticeTone, ToneStyle> = {
  // Calm sky blue — neutral status / "in progress".
  info: {
    card: "border-sky-200/70 bg-gradient-to-br from-[#d6f3ff] to-[#c0e3ff]",
    text: "text-sky-950",
    body: "text-sky-900/70",
    cta: "bg-sky-600 text-white hover:bg-sky-700",
  },
  // Warm butter yellow (#fcf6bd) → amber — needs attention, not yet alarming.
  warning: {
    card: "border-amber-300/70 bg-gradient-to-br from-[#fcf6bd] to-[#ffd98a]",
    text: "text-amber-950",
    body: "text-amber-900/70",
    cta: "bg-amber-500 text-amber-950 hover:bg-amber-400",
  },
  // Fresh mint green — all good / positive balance.
  success: {
    card: "border-emerald-200/70 bg-gradient-to-br from-[#c7f9cc] to-[#9af1dd]",
    text: "text-emerald-950",
    body: "text-emerald-900/70",
    cta: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  // Soft rose (#ff5d8f) — high-priority nudge to act now.
  announcement: {
    card: "border-pink-200/70 bg-gradient-to-br from-[#ffd6e7] to-[#ffaecb]",
    text: "text-rose-950",
    body: "text-rose-900/75",
    cta: "bg-[#ff5d8f] text-white hover:bg-[#ff4080]",
  },
}

/**
 * Small status / announcement card for the bottom of the sidebar
 * (verification status, credits, etc.). Hidden when the sidebar collapses
 * to icons.
 */
export function SidebarNotice({
  tone = "info",
  title,
  body,
  cta,
}: {
  tone?: NoticeTone
  title: string
  body?: string
  cta?: { label: string; href: string }
}) {
  const t = TONES[tone]

  return (
    <div
      className={cn(
        "rounded-md border p-3 group-data-[collapsible=icon]:hidden",
        t.card,
        t.text,
      )}
    >
      <p className="text-[13px] font-semibold leading-tight">{title}</p>
      {body ? (
        <p className={cn("mt-1.5 text-[11px] leading-snug", t.body)}>{body}</p>
      ) : null}
      {cta ? (
        <Link
          href={cta.href}
          className={cn(
            "mt-2.5 inline-flex w-full items-center justify-center rounded-md px-3 py-1.5 text-[11px] font-bold transition-colors",
            t.cta,
          )}
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  )
}
