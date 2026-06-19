import Link from "next/link"
import { cn } from "@/lib/utils"

export type NoticeTone = "info" | "warning" | "success" | "announcement"

type ToneStyle = {
  /** Card surface — soft tinted bg + matching border so it reads as a distinct block. */
  card: string
  /** Filled CTA pill — the single thing we want clicked. */
  cta: string
}

/**
 * Soft, type-coded palettes. The tone shows in the BORDER + soft BG + the CTA;
 * the title/body always use the theme's foreground/muted tokens so the copy is
 * high-contrast and readable in BOTH light and dark mode (the `*-foreground`
 * tokens are for text on a SOLID fill, not on these soft `*-bg` surfaces — using
 * them here washed the text out in dark mode).
 */
const TONES: Record<NoticeTone, ToneStyle> = {
  info: {
    card: "border-info/30 bg-info-bg",
    cta: "bg-info text-white hover:bg-info/85",
  },
  warning: {
    card: "border-warning/30 bg-warning-bg",
    cta: "bg-warning text-warning-foreground hover:bg-warning/85",
  },
  success: {
    card: "border-success/30 bg-success-bg",
    cta: "bg-success text-success-foreground hover:bg-success/85",
  },
  announcement: {
    card: "border-primary/30 bg-accent",
    cta: "bg-primary text-primary-foreground hover:bg-primary/90",
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
        "rounded-md lg:rounded-[0.556vw] border p-3 lg:p-[0.833vw] group-data-[collapsible=icon]:hidden",
        t.card,
      )}
    >
      <p className="text-[13px] lg:text-[0.903vw] font-semibold leading-tight text-foreground">{title}</p>
      {body ? (
        <p className="mt-1.5 lg:mt-[0.417vw] text-[11px] lg:text-[0.764vw] leading-snug text-muted-foreground">{body}</p>
      ) : null}
      {cta ? (
        <Link
          href={cta.href}
          className={cn(
            "mt-2.5 lg:mt-[0.694vw] inline-flex w-full items-center justify-center rounded-md lg:rounded-[0.556vw] px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-[11px] lg:text-[0.764vw] font-bold transition-colors",
            t.cta,
          )}
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  )
}
