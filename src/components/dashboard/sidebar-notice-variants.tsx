import Link from "next/link";
import * as React from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

// ── PREVIEW ONLY ──────────────────────────────────────────────────────────────
// Candidate sidebar-notice designs for the sandbox. Once a direction is picked,
// the winner replaces src/components/dashboard/sidebar-notice.tsx and the rest
// of this file is deleted.

export type NoticeTone = "info" | "warning" | "success" | "announcement";

export type NoticeModel = {
  tone: NoticeTone;
  icon: IconName;
  /** Tiny uppercase label. */
  eyebrow: string;
  /** Bold one-liner (the number/name can be emphasized by the variant). */
  headline: string;
  body: string;
  cta: { label: string; href: string };
  /** Adds a soft pulsing accent — for time-sensitive states (owe / low / leads). */
  urgent?: boolean;
  // Greeting variant:
  greeting?: string;
  // Stat variant:
  stats?: { value: string; label: string }[];
  message?: string;
};

type ToneClasses = {
  card: string;
  chip: string;
  accent: string;
  cta: string;
  dot: string;
};

// A refined, premium palette built on Tailwind's color scales (theme-aware via
// dark: variants). Success is a clean EMERALD — deliberately a touch different
// from the system `--success` token, which felt muddy in the card.
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
};

const ENTER = "animate-in fade-in-0 slide-in-from-bottom-2 duration-500";
// Tighter corners than the old rounded-lg — the card read as over-rounded.
const RADIUS = "rounded-md lg:rounded-[0.417vw]";

/** A soft pulsing dot in the corner for urgent notices. */
function PulseDot({ dot }: { dot: string }) {
  return (
    <span className="absolute right-3 top-3 lg:right-[0.833vw] lg:top-[0.833vw] flex size-2 lg:size-[0.556vw] motion-reduce:hidden">
      <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", dot)} />
      <span className={cn("relative inline-flex size-2 lg:size-[0.556vw] rounded-full", dot)} />
    </span>
  );
}

/** Full-width CTA pill with an arrow icon that slides on hover. */
function CtaPill({ tone, label, href }: { tone: ToneClasses; label: string; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group/cta mt-3 lg:mt-[0.833vw] flex w-full items-center justify-center gap-1.5 lg:gap-[0.417vw] px-3 lg:px-[0.833vw] py-1.5 lg:py-[0.417vw] text-[11px] lg:text-[0.764vw] font-bold transition-colors",
        RADIUS,
        tone.cta,
      )}
    >
      {label}
      <Icon
        name="arrow-right"
        className="size-3.5 lg:size-[0.972vw] transition-transform duration-200 group-hover/cta:translate-x-0.5"
      />
    </Link>
  );
}

// ── Variant A: Premium status card ──────────────────────────────────────────
export function PremiumNotice({ model }: { model: NoticeModel }) {
  const t = TONE[model.tone];
  return (
    <div className={cn("group relative overflow-hidden border p-3.5 lg:p-[0.972vw]", RADIUS, t.card, ENTER)}>
      {model.urgent ? <PulseDot dot={t.dot} /> : null}
      <div className="flex items-center gap-2 lg:gap-[0.556vw]">
        <span className={cn("grid size-7 lg:size-[1.944vw] shrink-0 place-items-center", RADIUS, t.chip)}>
          <Icon name={model.icon} className="size-4 lg:size-[1.111vw]" />
        </span>
        <span className={cn("text-[10px] lg:text-[0.694vw] font-semibold uppercase tracking-wider", t.accent)}>
          {model.eyebrow}
        </span>
      </div>
      <p className="mt-2.5 lg:mt-[0.694vw] text-sm lg:text-[0.972vw] font-semibold leading-snug text-foreground">
        {model.headline}
      </p>
      <p className="mt-1 lg:mt-[0.278vw] text-[11px] lg:text-[0.764vw] leading-snug text-muted-foreground">
        {model.body}
      </p>
      <CtaPill tone={t} label={model.cta.label} href={model.cta.href} />
    </div>
  );
}

// ── Variant B: Greeting + smart tip ─────────────────────────────────────────
export function GreetingNotice({ model }: { model: NoticeModel }) {
  const t = TONE[model.tone];
  return (
    <div className={cn("relative border border-border bg-card p-3.5 lg:p-[0.972vw]", RADIUS, ENTER)}>
      {model.urgent ? <PulseDot dot={t.dot} /> : null}
      <p className="text-sm lg:text-[0.972vw] font-semibold text-foreground">{model.greeting ?? model.headline}</p>
      <p className="mt-1.5 lg:mt-[0.417vw] text-[12px] lg:text-[0.833vw] leading-snug text-muted-foreground">
        {model.message ?? model.body}
      </p>
      <Link
        href={model.cta.href}
        className={cn("group/cta mt-2.5 lg:mt-[0.694vw] inline-flex items-center gap-1 lg:gap-[0.278vw] text-[12px] lg:text-[0.833vw] font-bold", t.accent)}
      >
        {model.cta.label}
        <Icon
          name="arrow-right"
          className="size-3.5 lg:size-[0.972vw] transition-transform duration-200 group-hover/cta:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

// ── Variant C: Stat-rich mini-card ──────────────────────────────────────────
export function StatNotice({ model }: { model: NoticeModel }) {
  const t = TONE[model.tone];
  const stats = model.stats ?? [];
  return (
    <div className={cn("relative overflow-hidden border p-3.5 lg:p-[0.972vw]", RADIUS, t.card, ENTER)}>
      {model.urgent ? <PulseDot dot={t.dot} /> : null}
      {stats.length > 0 ? (
        <div className="flex items-stretch justify-between gap-1 lg:gap-[0.278vw] text-center">
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 ? <span className="w-px self-stretch bg-border" /> : null}
              <div className="flex-1">
                <p className="text-sm lg:text-[0.972vw] font-bold tabular-nums leading-none text-foreground">{s.value}</p>
                <p className="mt-1 lg:mt-[0.278vw] text-[9px] lg:text-[0.625vw] uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
              </div>
            </React.Fragment>
          ))}
        </div>
      ) : null}
      <p className="mt-3 lg:mt-[0.833vw] text-[12px] lg:text-[0.833vw] leading-snug text-foreground">
        {model.message ?? model.body}
      </p>
      <CtaPill tone={t} label={model.cta.label} href={model.cta.href} />
    </div>
  );
}
