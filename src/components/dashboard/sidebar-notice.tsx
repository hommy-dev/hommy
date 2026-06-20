import Link from "next/link"
import { Icon, type IconName } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

export type NoticeTone = "info" | "warning" | "success" | "announcement"

type ToneClasses = {
  card: string
  chip: string
  accent: string
  cta: string
  dot: string
}

// Refined, premium palette on Tailwind's color scales (theme-aware via dark:).
// Success is a clean EMERALD — deliberately distinct from the muddy system
// `--success`. The tone shows in the chip + eyebrow + CTA; title/body stay on
// foreground/muted so the copy is always high-contrast in light AND dark.
const TONE: Record<NoticeTone, ToneClasses> = {
  success: {
    card: "border-emerald-200/80 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    accent: "text-emerald-700 dark:text-emerald-300",
    cta: "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400",
    dot: "bg-emerald-500",
  },
  warning: {
    card: "border-amber-200/80 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    accent: "text-amber-700 dark:text-amber-300",
    cta: "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300",
    dot: "bg-amber-500",
  },
  info: {
    card: "border-sky-200/80 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/40",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
    accent: "text-sky-700 dark:text-sky-300",
    cta: "bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-sky-950 dark:hover:bg-sky-400",
    dot: "bg-sky-500",
  },
  announcement: {
    card: "border-indigo-200/80 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/40",
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
    accent: "text-indigo-700 dark:text-indigo-300",
    cta: "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:text-indigo-950 dark:hover:bg-indigo-400",
    dot: "bg-indigo-500",
  },
}

// Sensible per-tone defaults so a notice can omit icon/eyebrow if it wants.
const TONE_DEFAULT: Record<NoticeTone, { icon: IconName; eyebrow: string }> = {
  success: { icon: "tick-square", eyebrow: "All set" },
  warning: { icon: "danger-triangle", eyebrow: "Action needed" },
  info: { icon: "info-square", eyebrow: "Update" },
  announcement: { icon: "discovery", eyebrow: "Heads up" },
}

/**
 * Premium status / announcement card for the bottom of the sidebar — the one
 * splash of color in a neutral rail. Icon chip + eyebrow + bold line + a CTA
 * whose arrow slides on hover; urgent notices get a soft pulsing dot. Hidden
 * when the sidebar collapses to icons.
 */
export function SidebarNotice({
  tone = "info",
  icon,
  eyebrow,
  title,
  body,
  cta,
  urgent,
}: {
  tone?: NoticeTone
  icon?: IconName
  eyebrow?: string
  title: string
  body?: string
  cta?: { label: string; href: string }
  /** Soft pulsing accent for time-sensitive states (owe / low / new leads). */
  urgent?: boolean
}) {
  const t = TONE[tone]
  const ic = icon ?? TONE_DEFAULT[tone].icon
  const eb = eyebrow ?? TONE_DEFAULT[tone].eyebrow

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-md lg:rounded-[0.417vw] border p-3.5 lg:p-[0.972vw] group-data-[collapsible=icon]:hidden",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        t.card,
      )}
    >
      {urgent ? (
        <span className="absolute right-3 top-3 lg:right-[0.833vw] lg:top-[0.833vw] flex size-2 lg:size-[0.556vw] motion-reduce:hidden">
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", t.dot)} />
          <span className={cn("relative inline-flex size-2 lg:size-[0.556vw] rounded-full", t.dot)} />
        </span>
      ) : null}

      <div className="flex items-center gap-2 lg:gap-[0.556vw]">
        <span className={cn("grid size-7 lg:size-[1.944vw] shrink-0 place-items-center rounded-md lg:rounded-[0.417vw]", t.chip)}>
          <Icon name={ic} className="size-4 lg:size-[1.111vw]" />
        </span>
        <span className={cn("text-[10px] lg:text-[0.694vw] font-semibold uppercase tracking-wider", t.accent)}>
          {eb}
        </span>
      </div>

      <p className="mt-2.5 lg:mt-[0.694vw] text-sm lg:text-[0.972vw] font-semibold leading-snug text-foreground">
        {title}
      </p>
      {body ? (
        <p className="mt-1 lg:mt-[0.278vw] text-[11px] lg:text-[0.764vw] leading-snug text-muted-foreground">
          {body}
        </p>
      ) : null}

      {cta ? (
        <Link
          href={cta.href}
          className={cn(
            "group/cta mt-3 lg:mt-[0.833vw] flex w-full items-center justify-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.417vw] px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-[11px] lg:text-[0.8vw] font-semibold transition-colors bg-background border",
            // t.cta,
          )}
        >
          {cta.label}
          <Icon
            name="arrow-right"
            className="size-3.5 lg:size-[0.972vw] transition-transform duration-200 group-hover/cta:translate-x-0.5"
          />
        </Link>
      ) : null}
    </div>
  )
}
