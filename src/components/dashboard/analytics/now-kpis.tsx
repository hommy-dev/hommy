import { getContractorOverview } from "@/lib/data/overview"
import { scoreStanding } from "@/lib/reputation/labels"
import { creditStatView } from "@/lib/credits/stat"
import { OverviewStat, type StatDelta } from "@/components/dashboard/overview/overview-stat"

function upDown(n: number, label: string): StatDelta | undefined {
  if (n > 0) return { label: `${n} ${label}`, dir: "up" }
  if (n < 0) return { label: `${Math.abs(n)} ${label}`, dir: "down" }
  return undefined
}

/** The "right now" snapshot row — mirrors the Overview KPI cards (current state,
 *  not range-bound), sitting above the range-based performance KPIs. */
export async function NowKpis({
  contractorId,
  userId,
  creditBalance,
  profileScore,
}: {
  contractorId: string
  userId: string
  creditBalance: number
  profileScore: number
}) {
  const o = await getContractorOverview(contractorId, userId)
  const standing = scoreStanding(profileScore)
  const credits = creditStatView(creditBalance, o.creditsTrend7d)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-[1.111vw]">
      <OverviewStat
        label="Open offers"
        value={o.openOffers}
        hint="Waiting on you"
        tone="primary"
        href="/contractor/jobs"
        delta={o.offersTrend7d > 0 ? { label: `${o.offersTrend7d} this week`, dir: "up" } : undefined}
        series={o.offersSeries}
      />
      <OverviewStat
        label="Active jobs"
        value={o.activeJobs}
        hint="In your pipeline"
        href="/contractor/jobs"
        delta={o.jobsTrend7d > 0 ? { label: `${o.jobsTrend7d} this week`, dir: "up" } : undefined}
        series={o.jobsSeries}
        delayMs={60}
      />
      <OverviewStat
        label="Credits"
        value={creditBalance}
        hint={credits.hint}
        tone={credits.tone}
        href="/contractor/settings/billing"
        delta={credits.delta}
        series={o.creditsSeries}
        delayMs={120}
      />
      <OverviewStat
        label="Standing"
        value={profileScore}
        hint={standing.label}
        delta={upDown(o.standingTrend7d, "this week")}
        series={o.standingSeries}
        delayMs={180}
      />
    </div>
  )
}
