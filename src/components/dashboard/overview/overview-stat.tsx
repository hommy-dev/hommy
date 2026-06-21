import Link from "next/link"
import { Icon, type IconName } from "@/components/ui/icon"
import { Sparkline } from "@/components/ui/sparkline"
import { cn } from "@/lib/utils"

export type StatTone = "neutral" | "primary" | "success" | "warning" | "destructive"

export type StatDelta = { label: string; dir: "up" | "down" | "flat" }

const VALUE: Record<StatTone, string> = {
  neutral: "text-foreground",
  primary: "text-foreground",
  success: "text-foreground",
  warning: "text-warning",
  destructive: "text-destructive",
}

const HINT: Record<StatTone, string> = {
  neutral: "text-muted-foreground",
  primary: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
}

const CHART: Record<StatTone, string> = {
  neutral: "text-primary",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
}

const DELTA: Record<StatDelta["dir"], { cls: string; icon: IconName | null }> = {
  up: { cls: "bg-success-bg text-success", icon: "arrow-up" },
  down: { cls: "bg-destructive-bg text-destructive", icon: "arrow-down" },
  flat: { cls: "bg-muted text-muted-foreground", icon: null },
}

export function OverviewStat({
  label,
  value,
  hint,
  tone = "neutral",
  href,
  delta,
  series,
  delayMs = 0,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  tone?: StatTone
  href?: string
  delta?: StatDelta
  series?: number[]
  delayMs?: number
}) {
  const body = (
    <div
      className="homei-rise homei-lift flex h-full flex-col rounded-xl lg:rounded-[0.833vw] border border-border bg-card p-5 lg:p-[1.389vw] shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-center justify-between gap-2 lg:gap-[0.556vw]">
        <span className="text-sm lg:text-[0.903vw] text-muted-foreground">{label}</span>
        {delta ? (
          <span className={cn("inline-flex items-center gap-0.5 lg:gap-[0.139vw] rounded-full px-1.5 lg:px-[0.417vw] py-0.5 lg:py-[0.139vw] text-[11px] lg:text-[0.764vw] font-semibold tabular-nums", DELTA[delta.dir].cls)}>
            {DELTA[delta.dir].icon ? <Icon name={DELTA[delta.dir].icon!} className="size-3 lg:size-[0.833vw]" /> : null}
            {delta.label}
          </span>
        ) : null}
      </div>

      <p className={cn("mt-2 lg:mt-[0.556vw] font-sebenta text-[2rem] lg:text-[2.222vw] font-bold leading-none tracking-tight tabular-nums", VALUE[tone])}>
        {value}
      </p>
      {hint ? <p className={cn("mt-1.5 lg:mt-[0.417vw] text-xs lg:text-[0.833vw]", HINT[tone])}>{hint}</p> : null}

      {series && series.length > 1 ? (
        <div className={cn("mt-4 lg:mt-[1.111vw] flex-1", CHART[tone])}>
          <Sparkline data={series} className="h-12 lg:h-[3.6vw]" />
        </div>
      ) : null}
    </div>
  )

  if (!href) return body
  return (
    <Link href={href} prefetch className="block rounded-xl lg:rounded-[0.833vw] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  )
}
