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
  info: {
    card: "border-info/30 bg-info-bg",
    text: "text-info-foreground",
    body: "text-info-foreground/70",
    cta: "bg-info text-white hover:bg-info/85",
  },
  warning: {
    card: "border-warning/30 bg-warning-bg",
    text: "text-warning-foreground",
    body: "text-warning-foreground/70",
    cta: "bg-warning text-warning-foreground hover:bg-warning/85",
  },
  success: {
    card: "border-success/30 bg-success-bg",
    text: "text-success-foreground",
    body: "text-success-foreground/70",
    cta: "bg-success text-success-foreground hover:bg-success/85",
  },
  announcement: {
    card: "border-primary/30 bg-accent",
    text: "text-primary",
    body: "text-primary/70",
    cta: "bg-secondary text-secondary-foreground hover:bg-secondary/85",
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
