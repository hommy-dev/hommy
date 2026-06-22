import Link from "next/link"
import { Icon, type IconName } from "@/components/ui/icon"
import { formatDistanceToNow } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ActivityItem } from "@/lib/data/overview"
import type { StatTone } from "./overview-stat"

/** An action the contractor can take now (a lead, a quote, low credits…). */
export type ActionRow = {
  key: string
  icon: IconName
  tone: StatTone
  title: string
  subtitle: string
  href: string
  cta: string
}

const CHIP: Record<StatTone, string> = {
  neutral: "bg-muted text-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  destructive: "bg-destructive-bg text-destructive",
}

/** Icon + tone for an activity row, from its notification type/title. */
function activityVisual(type: string, title: string): { icon: IconName; tone: StatTone } {
  const s = `${type} ${title}`.toLowerCase()
  if (s.includes("won") || s.includes("accept")) return { icon: "tick-square", tone: "success" }
  if (s.includes("lead")) return { icon: "discovery", tone: "primary" }
  if (s.includes("quote") || s.includes("estimate")) return { icon: "paper", tone: "neutral" }
  if (s.includes("review") || s.includes("rating")) return { icon: "star", tone: "warning" }
  if (s.includes("credit") || s.includes("balance") || s.includes("payment")) return { icon: "wallet", tone: "primary" }
  if (s.includes("message") || s.includes("chat") || s.includes("reply")) return { icon: "chat", tone: "primary" }
  if (s.includes("storm")) return { icon: "danger-triangle", tone: "warning" }
  if (s.includes("verif")) return { icon: "shield-done", tone: "success" }
  return { icon: "notification", tone: "neutral" }
}

function Chip({ tone, icon }: { tone: StatTone; icon: IconName }) {
  return (
    <span className={cn("flex size-9 lg:size-[2.5vw] shrink-0 items-center justify-center rounded-xl lg:rounded-[0.833vw]", CHIP[tone])}>
      <Icon name={icon} className="size-4 lg:size-[1.25vw]" />
    </span>
  )
}

export function OverviewFeed({
  actions,
  activity,
  firstName,
}: {
  actions: ActionRow[]
  activity: ActivityItem[]
  firstName: string
}) {
  const isEmpty = actions.length === 0 && activity.length === 0

  return (
    <section className="hommy-rise rounded-xl lg:rounded-[0.833vw] border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <header className="flex flex-wrap items-end justify-between gap-2 lg:gap-[0.556vw] px-5 lg:px-[1.389vw] pt-5 lg:pt-[1.389vw] pb-3 lg:pb-[0.833vw]">
        <div>
          <h2 className="text-sm lg:text-[0.972vw] font-semibold">Your feed</h2>
          <p className="mt-0.5 lg:mt-[0.139vw] text-xs lg:text-[0.833vw] text-muted-foreground">
            {actions.length > 0
              ? `${actions.length} thing${actions.length === 1 ? "" : "s"} need you, ${firstName}, plus the latest updates.`
              : `You're caught up, ${firstName}. Here's the latest across your company.`}
          </p>
        </div>
      </header>

      {isEmpty ? (
        <div className="px-5 lg:px-[1.389vw] py-12 lg:py-[3.333vw] text-center">
          <span className="mx-auto flex size-10 lg:size-[2.778vw] items-center justify-center rounded-full bg-success-bg text-success">
            <Icon name="tick-square" className="size-5 lg:size-[1.389vw]" />
          </span>
          <p className="mt-3 lg:mt-[0.833vw] text-sm lg:text-[0.972vw] font-medium">All quiet for now, {firstName}</p>
          <p className="mx-auto mt-1 lg:mt-[0.278vw] max-w-sm lg:max-w-[24vw] text-xs lg:text-[0.833vw] text-muted-foreground">
            Nothing needs you right now. New leads, messages, and updates will land here the moment they happen.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {/* Actions first — these are things to do now. */}
          {actions.map((a) => (
            <li key={a.key}>
              <Link
                href={a.href}
                prefetch
                className="flex items-center gap-3 lg:gap-[0.833vw] px-5 lg:px-[1.389vw] py-3.5 lg:py-[0.972vw] transition-colors hover:bg-muted/40"
              >
                <Chip tone={a.tone} icon={a.icon} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm lg:text-[0.972vw] font-medium text-foreground">{a.title}</p>
                  <p className="truncate text-xs lg:text-[0.833vw] text-muted-foreground">{a.subtitle}</p>
                </div>
                <span className="hidden sm:flex shrink-0 items-center gap-1 lg:gap-[0.278vw] rounded-full bg-primary/10 px-3 lg:px-[0.833vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-semibold text-primary">
                  {a.cta}
                  <Icon name="arrow-right" className="size-3.5 lg:size-[0.972vw]" />
                </span>
                <Icon name="arrow-right" className="sm:hidden size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}

          {/* Recent activity — what just happened. */}
          {activity.map((item) => {
            const v = activityVisual(item.type, item.title)
            const inner = (
              <div className="flex items-center gap-3 lg:gap-[0.833vw] px-5 lg:px-[1.389vw] py-3.5 lg:py-[0.972vw]">
                <Chip tone={v.tone} icon={v.icon} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 lg:gap-[0.417vw] text-sm lg:text-[0.972vw] font-medium text-foreground">
                    {!item.isRead ? <span className="size-1.5 lg:size-[0.417vw] shrink-0 rounded-full bg-primary" aria-hidden="true" /> : null}
                    <span className="truncate">{item.title}</span>
                  </p>
                  {item.body ? <p className="truncate text-xs lg:text-[0.833vw] text-muted-foreground">{item.body}</p> : null}
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs lg:text-[0.764vw] text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt))}
                </span>
              </div>
            )
            return (
              <li key={item.id}>
                {item.actionUrl ? (
                  <Link href={item.actionUrl} prefetch className="block transition-colors hover:bg-muted/40">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
