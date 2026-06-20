import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import {
  getReputationOverview,
  getAreaComparison,
  type AreaComparison,
} from "@/lib/data/reputation"
import { scoreEventCopy, scoreStanding } from "@/lib/reputation/labels"
import {
  SCORE_DELTAS,
  reviewScoreDelta,
  FAST_ENGAGE_FRACTION,
  LEAD_FANOUT,
} from "@/lib/config/tunables"
import { formatDistanceToNow } from "@/lib/format"
import { EmptyState } from "@/components/ui/empty-state"
import { Icon, type IconName } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

/** Signed delta with a real minus glyph: +5 / −3 / 0. */
function signed(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `−${Math.abs(n)}`
  return "0"
}

type Tip = { icon: IconName; title: string; blurb: string; delta: string; tone: "up" | "steady" }

export default async function ContractorReputationPage() {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)

  if (!contractor) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your company isn’t set up yet. Finish onboarding to start building your reputation.
      </p>
    )
  }

  const score = contractor.profileScore
  const status = scoreStanding(score)
  const [{ trend30d, events }, comparison] = await Promise.all([
    getReputationOverview(contractor.id),
    getAreaComparison(contractor.id),
  ])

  const tips: Tip[] = [
    {
      icon: "discovery",
      title: "Reply to new leads quickly",
      blurb: `Engage within the first ${FAST_ENGAGE_FRACTION * 100}% of the response window and earn the fast bonus instead of the standard ${signed(SCORE_DELTAS.engagement)}.`,
      delta: signed(SCORE_DELTAS.fast_engagement),
      tone: "up",
    },
    {
      icon: "bag",
      title: "Win the job",
      blurb: "The biggest lift. When a homeowner accepts your quote, your score jumps.",
      delta: signed(SCORE_DELTAS.quote_accepted),
      tone: "up",
    },
    {
      icon: "star",
      title: "Earn great reviews",
      blurb: `Finish strong and ask happy homeowners to review you. A 5★ review is worth up to ${signed(reviewScoreDelta(5))}.`,
      delta: signed(reviewScoreDelta(5)),
      tone: "up",
    },
    {
      icon: "info-square",
      title: "Add a reason when you pass",
      blurb: `Declining with a reason keeps your score steady. A silent pass costs ${signed(SCORE_DELTAS.decline_no_reason)}.`,
      delta: signed(SCORE_DELTAS.decline_with_reason),
      tone: "steady",
    },
    {
      icon: "shield-done",
      title: "Keep deals on Homei",
      blurb: `Wins are how you grow. Taking a job off-platform risks ${signed(SCORE_DELTAS.off_platform_flag)}.`,
      delta: signed(SCORE_DELTAS.off_platform_flag),
      tone: "steady",
    },
  ]

  const trendLabel =
    trend30d > 0
      ? `Up ${trend30d} in the last 30 days`
      : trend30d < 0
        ? `Down ${Math.abs(trend30d)} in the last 30 days`
        : "No change in the last 30 days"

  return (
    <div className="space-y-8 lg:space-y-[2.222vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">Reputation</h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Your score decides how high you rank when new jobs go out. Here’s where you stand and how to climb.
        </p>
      </header>

      {/* Score hero */}
      <section className="rounded-lg lg:rounded-[0.694vw] border border-border bg-card p-6 lg:p-[1.667vw]">
        <div className="flex flex-wrap items-start justify-between gap-6 lg:gap-[1.667vw]">
          <div className="flex items-end gap-4 lg:gap-[1.111vw]">
            <span className="font-sebenta text-5xl lg:text-[3.5vw] font-bold leading-none tracking-tight tabular-nums">
              {score}
            </span>
            <div className="pb-1 lg:pb-[0.278vw]">
              <p className="text-base lg:text-[1.111vw] font-semibold">{status.label}</p>
              <span
                className={cn(
                  "mt-1 lg:mt-[0.278vw] inline-flex items-center gap-1 lg:gap-[0.278vw] text-xs lg:text-[0.833vw] font-medium",
                  trend30d > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : trend30d < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground",
                )}
              >
                {trend30d !== 0 ? (
                  <Icon name={trend30d > 0 ? "arrow-up" : "arrow-down"} className="size-3.5 lg:size-[0.972vw]" />
                ) : null}
                {trendLabel}
              </span>
            </div>
          </div>
          <p className="max-w-sm lg:max-w-[24vw] text-sm lg:text-[0.903vw] text-muted-foreground">
            {status.blurb}
          </p>
        </div>
        <p className="mt-5 lg:mt-[1.389vw] border-t border-border pt-4 lg:pt-[1.111vw] text-xs lg:text-[0.833vw] text-muted-foreground">
          Score never drops below 0. Each new job reaches the top {LEAD_FANOUT.maxRecipients} eligible pros by score, so a higher score means you see more work first. Speed is rewarded, never penalized.
        </p>
      </section>

      {/* Area comparison */}
      <section className="space-y-3 lg:space-y-[0.833vw]">
        <h2 className="text-lg lg:text-[1.25vw] font-semibold tracking-tight">How you compare in your area</h2>
        <AreaComparisonCard comparison={comparison} selfScore={score} />
      </section>

      {/* Ways to improve */}
      <section className="space-y-3 lg:space-y-[0.833vw]">
        <h2 className="text-lg lg:text-[1.25vw] font-semibold tracking-tight">Ways to improve</h2>
        <div className="grid gap-3 lg:gap-[0.833vw] sm:grid-cols-2 lg:grid-cols-3">
          {tips.map((tip) => (
            <div
              key={tip.title}
              className="flex flex-col rounded-md lg:rounded-[0.556vw] border border-border bg-card p-4 lg:p-[1.111vw]"
            >
              <div className="flex items-center justify-between gap-2 lg:gap-[0.556vw]">
                <span className="flex size-9 lg:size-[2.5vw] items-center justify-center rounded-xl lg:rounded-[0.926vw] bg-muted text-foreground">
                  <Icon name={tip.icon} className="size-4 lg:size-[1.25vw]" />
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.833vw] font-semibold tabular-nums",
                    tip.tone === "up"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {tip.delta}
                </span>
              </div>
              <p className="mt-3 lg:mt-[0.833vw] text-sm lg:text-[0.972vw] font-medium text-foreground">{tip.title}</p>
              <p className="mt-1 lg:mt-[0.278vw] text-xs lg:text-[0.833vw] text-muted-foreground">{tip.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section className="space-y-3 lg:space-y-[0.833vw]">
        <h2 className="text-lg lg:text-[1.25vw] font-semibold tracking-tight">Recent activity</h2>
        {events.length === 0 ? (
          <EmptyState
            size="sm"
            icon="chart"
            title="No score changes yet"
            description="As you engage leads, win jobs, and collect reviews, every change shows up here so you always know what moved your score."
          />
        ) : (
          <ul className="overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border">
            {events.map((e, i) => {
              const copy = scoreEventCopy(e.kind)
              const positive = e.delta > 0
              const neutral = e.delta === 0
              return (
                <li
                  key={e.id}
                  className={cn(
                    "flex items-start justify-between gap-4 lg:gap-[1.111vw] px-4 lg:px-[1.111vw] py-3.5 lg:py-[0.972vw]",
                    i > 0 && "border-t border-border",
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm lg:text-[0.972vw] font-medium text-foreground">{copy.title}</p>
                    <p className="mt-0.5 lg:mt-[0.139vw] text-xs lg:text-[0.833vw] text-muted-foreground">
                      {copy.blurb}
                      {e.note ? ` “${e.note}”` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5 lg:gap-[0.139vw]">
                    <span
                      className={cn(
                        "text-sm lg:text-[0.972vw] font-semibold tabular-nums",
                        neutral
                          ? "text-muted-foreground"
                          : positive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {signed(e.delta)}
                    </span>
                    <span className="whitespace-nowrap text-xs lg:text-[0.764vw] text-muted-foreground">
                      {formatDistanceToNow(new Date(e.createdAt))}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function AreaComparisonCard({
  comparison,
  selfScore,
}: {
  comparison: AreaComparison | null
  selfScore: number
}) {
  // No overlapping peers (or coverage/services not set up yet).
  if (!comparison || comparison.peerCount === 0) {
    return (
      <div className="rounded-md lg:rounded-[0.556vw] border border-border bg-card p-5 lg:p-[1.389vw]">
        <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
          No nearby companies to compare with yet. Once more verified roofers cover your area, you’ll see how your score stacks up against theirs. Make sure your services and coverage area are set so we can match you accurately.
        </p>
      </div>
    )
  }

  const { rank, total, averageScore, rungs } = comparison
  const vsAvg = selfScore - averageScore
  const maxScore = Math.max(1, averageScore, ...rungs.map((r) => r.score))

  // Show the top rungs; always include self even if it sits below the cut.
  const TOP = 5
  const top = rungs.slice(0, TOP)
  const selfInTop = top.some((r) => r.isSelf)
  const display = selfInTop ? top : [...top, ...rungs.filter((r) => r.isSelf)]

  return (
    <div className="space-y-4 lg:space-y-[1.111vw] rounded-md lg:rounded-[0.556vw] border border-border bg-card p-5 lg:p-[1.389vw]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 lg:gap-[0.556vw]">
        <p className="text-sm lg:text-[0.972vw]">
          You rank <span className="font-semibold text-foreground">#{rank}</span> of {total} roofer{total === 1 ? "" : "s"} in your area.
        </p>
        <p
          className={cn(
            "text-xs lg:text-[0.833vw] font-medium",
            vsAvg > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : vsAvg < 0
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground",
          )}
        >
          {vsAvg > 0
            ? `${vsAvg} above the area average (${averageScore})`
            : vsAvg < 0
              ? `${Math.abs(vsAvg)} below the area average (${averageScore})`
              : `Right at the area average (${averageScore})`}
        </p>
      </div>

      <ul className="space-y-2.5 lg:space-y-[0.694vw]">
        {display.map((r, i) => {
          // position in the full ranking (1-based); self keeps its true rank
          const pos = r.isSelf ? rank : i + 1
          const showGap = !selfInTop && r.isSelf && rank > TOP
          return (
            <li key={r.isSelf ? "self" : `peer-${i}`}>
              {showGap ? (
                <p className="mb-2.5 lg:mb-[0.694vw] text-center text-xs lg:text-[0.764vw] text-muted-foreground">
                  ···
                </p>
              ) : null}
              <div className="flex items-center gap-3 lg:gap-[0.833vw]">
                <span className="w-6 lg:w-[2vw] shrink-0 text-right text-xs lg:text-[0.833vw] tabular-nums text-muted-foreground">
                  {pos}
                </span>
                <div className="h-7 lg:h-[1.944vw] flex-1 overflow-hidden rounded-md lg:rounded-[0.417vw] bg-muted">
                  <div
                    className={cn(
                      "flex h-full items-center rounded-md lg:rounded-[0.417vw] px-2.5 lg:px-[0.694vw]",
                      r.isSelf ? "bg-primary text-primary-foreground" : "bg-foreground/15 text-foreground",
                    )}
                    style={{ width: `${Math.max(12, Math.round((r.score / maxScore) * 100))}%` }}
                  >
                    <span className="truncate text-xs lg:text-[0.833vw] font-medium">
                      {r.isSelf ? "You" : "Roofer in your area"}
                    </span>
                  </div>
                </div>
                <span className="w-8 lg:w-[2.5vw] shrink-0 text-right text-sm lg:text-[0.903vw] font-semibold tabular-nums">
                  {r.score}
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="text-xs lg:text-[0.764vw] text-muted-foreground">
        Compared against verified companies that share a service and overlap your coverage area. Names are hidden, scores are not.
      </p>
    </div>
  )
}
