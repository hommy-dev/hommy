import { getReputationOverview, getAreaComparison, type AreaComparison } from "@/lib/data/reputation"
import { getReviewAnalytics, getScoreTrend, getCoverageMap } from "@/lib/data/analytics"
import { scoreEventCopy, scoreStanding } from "@/lib/reputation/labels"
import { formatDistanceToNow } from "@/lib/format"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { ChartCard } from "./chart-card"
import { HowToClimbCards } from "./climb-variants"
import { CoverageMap } from "./coverage-map"
import { Gauge } from "@/components/ui/charts/gauge"
import { StripPlot } from "@/components/ui/charts/strip-plot"

function signed(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `−${Math.abs(n)}`
  return "0"
}

export async function ReputationSection({
  contractorId,
  rangeDays,
  currentScore,
}: {
  contractorId: string
  rangeDays: number
  currentScore: number
}) {
  const status = scoreStanding(currentScore)
  const [{ events }, comparison, reviewsA, scoreTrend, coverage] = await Promise.all([
    getReputationOverview(contractorId),
    getAreaComparison(contractorId),
    getReviewAnalytics(contractorId, rangeDays),
    getScoreTrend(contractorId, rangeDays),
    getCoverageMap(contractorId, rangeDays),
  ])
  const totalLeadOrigins = coverage.origins.reduce((s, o) => s + (o.leads ?? 0), 0)

  const avg = reviewsA.avg
  // Soft, round cap so the gauge needle sits in a sensible spot (no hard max on score).
  const gaugeMax = Math.max(100, Math.ceil(currentScore / 50) * 50)

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      {/* Left: minimal score + reviews · Right: coverage map */}
      <div className="grid items-stretch gap-4 lg:gap-[1.111vw] lg:grid-cols-2">
        <div className="flex flex-col gap-4 lg:gap-[1.111vw]">
          <section className="homei-rise flex flex-1 items-center gap-5 lg:gap-[1.389vw] rounded-xl lg:rounded-[0.833vw] border border-border bg-card p-5 lg:p-[1.389vw] shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
            <Gauge value={currentScore} max={gaugeMax} centerValue={currentScore} centerLabel={status.label} />
            <div className="min-w-0 flex-1 space-y-2 lg:space-y-[0.556vw]">
              <div className="flex flex-wrap items-center gap-2 lg:gap-[0.556vw]">
                <h3 className="text-sm lg:text-[0.972vw] font-semibold">Reputation score</h3>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 lg:gap-[0.278vw] rounded-full px-2 lg:px-[0.556vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] font-semibold tabular-nums",
                    scoreTrend > 0 ? "bg-success-bg text-success" : scoreTrend < 0 ? "bg-destructive-bg text-destructive" : "bg-muted text-muted-foreground",
                  )}
                >
                  {scoreTrend !== 0 ? <Icon name={scoreTrend > 0 ? "arrow-up" : "arrow-down"} className="size-3 lg:size-[0.833vw]" /> : null}
                  {scoreTrend === 0 ? "No change" : signed(scoreTrend)} · {rangeDays}d
                </span>
              </div>
              <p className="text-sm lg:text-[0.903vw] text-muted-foreground">
                {status.blurb} A higher score means new jobs reach you first.
              </p>
            </div>
          </section>

          <section className="homei-rise flex flex-1 items-center gap-5 lg:gap-[1.389vw] rounded-xl lg:rounded-[0.833vw] border border-border bg-card p-5 lg:p-[1.389vw] shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
            <Gauge value={avg ?? 0} max={5} color="orange" centerValue={avg != null ? avg.toFixed(1) : "—"} centerLabel="out of 5" />
            <div className="min-w-0 flex-1 space-y-2 lg:space-y-[0.556vw]">
              <h3 className="text-sm lg:text-[0.972vw] font-semibold">Reviews</h3>
              <p className="text-sm lg:text-[0.903vw] text-muted-foreground">
                {reviewsA.total > 0 && avg != null
                  ? `Rated ${avg.toFixed(1)} from ${reviewsA.total} review${reviewsA.total === 1 ? "" : "s"}. Strong reviews lift your standing.`
                  : "No reviews yet. Ask happy homeowners for one after you finish a job."}
              </p>
            </div>
          </section>
        </div>

        <section className="homei-rise flex flex-col rounded-xl lg:rounded-[0.833vw] border border-border bg-card p-5 lg:p-[1.389vw] shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <header className="mb-3 lg:mb-[0.833vw]">
            <h3 className="text-sm lg:text-[0.972vw] font-semibold">Where your leads come from</h3>
            <p className="mt-0.5 lg:mt-[0.139vw] text-xs lg:text-[0.833vw] text-muted-foreground">
              {totalLeadOrigins > 0
                ? `Your coverage and ${totalLeadOrigins} lead${totalLeadOrigins === 1 ? "" : "s"} in this range.`
                : "Your coverage area and where leads land."}
            </p>
          </header>
          <CoverageMap hub={coverage.hub} origins={coverage.origins} />
        </section>
      </div>

      {/* How you compare — full-width single row */}
      <ChartCard
        title="How you compare in your area"
        purpose="Where your score sits among verified roofers who overlap your coverage. Names are hidden."
        empty={!comparison || comparison.peerCount === 0}
        emptyText="No nearby companies to compare with yet. Set your services and coverage area so we can match you accurately."
      >
        {comparison && comparison.peerCount > 0 ? <AreaComparison comparison={comparison} selfScore={currentScore} /> : null}
      </ChartCard>

      {/* How to climb — Grow / Protect cards */}
      <HowToClimbCards />

      {/* Recent score activity */}
      <section className="space-y-3 lg:space-y-[0.833vw]">
        <h3 className="text-sm lg:text-[0.972vw] font-semibold">Recent score activity</h3>
        {events.length === 0 ? (
          <div className="rounded-xl lg:rounded-[0.833vw] border border-border bg-card p-6 lg:p-[1.667vw] text-center text-sm lg:text-[0.903vw] text-muted-foreground">
            No score changes yet. As you engage leads, win jobs, and collect reviews, every change shows up here.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-xl lg:rounded-[0.833vw] border border-border bg-card">
            {events.map((e, i) => {
              const copy = scoreEventCopy(e.kind)
              const tone = e.delta > 0 ? "text-success" : e.delta < 0 ? "text-destructive" : "text-muted-foreground"
              return (
                <li key={e.id} className={cn("flex items-start justify-between gap-4 lg:gap-[1.111vw] px-4 lg:px-[1.111vw] py-3.5 lg:py-[0.972vw]", i > 0 && "border-t border-border")}>
                  <div className="min-w-0">
                    <p className="text-sm lg:text-[0.972vw] font-medium text-foreground">{copy.title}</p>
                    <p className="mt-0.5 lg:mt-[0.139vw] text-xs lg:text-[0.833vw] text-muted-foreground">
                      {copy.blurb}
                      {e.note ? ` “${e.note}”` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5 lg:gap-[0.139vw]">
                    <span className={cn("text-sm lg:text-[0.972vw] font-semibold tabular-nums", tone)}>{signed(e.delta)}</span>
                    <span className="whitespace-nowrap text-xs lg:text-[0.764vw] text-muted-foreground">{formatDistanceToNow(new Date(e.createdAt))}</span>
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

function AreaComparison({ comparison, selfScore }: { comparison: AreaComparison; selfScore: number }) {
  const { rank, total, averageScore, rungs } = comparison
  const vsAvg = selfScore - averageScore

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 lg:gap-[0.556vw]">
        <p className="text-sm lg:text-[0.972vw]">
          You rank <span className="font-semibold text-foreground">#{rank}</span> of {total} roofer{total === 1 ? "" : "s"} in your area.
        </p>
        <p className={cn("text-xs lg:text-[0.833vw] font-medium", vsAvg > 0 ? "text-success" : vsAvg < 0 ? "text-destructive" : "text-muted-foreground")}>
          {vsAvg > 0
            ? `${vsAvg} above the area average (${averageScore})`
            : vsAvg < 0
              ? `${Math.abs(vsAvg)} below the area average (${averageScore})`
              : `Right at the area average (${averageScore})`}
        </p>
      </div>

      <StripPlot points={rungs.map((r) => ({ score: r.score, isSelf: r.isSelf }))} average={averageScore} />

      <p className="text-xs lg:text-[0.764vw] text-muted-foreground">
        Each dot is a verified company that overlaps your coverage. Names are hidden, scores are not.
      </p>
    </div>
  )
}
