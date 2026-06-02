import Link from "next/link"
import { cn } from "@/lib/utils"

export type NoticeTone = "info" | "warning" | "success" | "announcement"

const TONES: Record<NoticeTone, string> = {
  info: "bg-accent text-foreground",
  warning:
    "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
  success: "bg-secondary text-secondary-foreground",
  announcement:
    "bg-gradient-to-br from-secondary to-tertiary/45 text-[#1a2a00]",
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
  icon,
}: {
  tone?: NoticeTone
  title: string
  body?: string
  cta?: { label: string; href: string }
  icon?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-3 group-data-[collapsible=icon]:hidden",
        TONES[tone],
      )}
    >
      <div className="flex items-center gap-2">
        {icon ? <span className="shrink-0">{icon}</span> : null}
        <p className="text-[13px] font-semibold leading-tight">{title}</p>
      </div>
      {body ? (
        <p className="mt-1 text-[11px] leading-snug opacity-75">{body}</p>
      ) : null}
      {cta ? (
        <Link
          href={cta.href}
          className="mt-2 inline-block text-[11px] font-bold underline underline-offset-2"
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  )
}
