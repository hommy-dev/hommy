import { getPerformanceAnalytics } from "@/lib/data/analytics"
import { OverviewStat, type StatDelta } from "@/components/dashboard/overview/overview-stat"
import { ChartCard } from "./chart-card"
import { AreaLineChart } from "@/components/ui/charts/area-line-chart"
import { BG, type ChartColor } from "@/components/ui/charts/palette"
import { cn } from "@/lib/utils"

function money(n: number): string {
  const a = Math.round(n)
  if (Math.abs(a) >= 1000) return `$${(a / 1000).toFixed(Math.abs(a) >= 10000 ? 0 : 1)}k`
  return `$${a}`
}

function pctDelta(value: number, prev: number): StatDelta | undefined {
  if (prev <= 0) return value > 0 ? { label: "new", dir: "up" } : undefined
  const c = Math.round(((value - prev) / prev) * 100)
  return c === 0 ? undefined : { label: `${Math.abs(c)}%`, dir: c > 0 ? "up" : "down" }
}

function ppDelta(value: number, prev: number): StatDelta | undefined {
  const d = Math.round(value) - Math.round(prev)
  return d === 0 ? undefined : { label: `${Math.abs(d)} pts`, dir: d > 0 ? "up" : "down" }
}

function Swatch({ color, label, dashed }: { color?: ChartColor; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 lg:gap-[0.417vw] text-xs lg:text-[0.764vw] text-muted-foreground">
      {dashed ? (
        <span className="h-0 w-3 lg:w-[0.833vw] border-t border-dashed border-muted-foreground" />
      ) : (
        <span className={cn("size-2.5 lg:size-[0.694vw] rounded-full", color ? BG[color] : "bg-primary")} />
      )}
      {label}
    </span>
  )
}

export async function PerformanceSection({ contractorId, rangeDays }: { contractorId: string; rangeDays: number }) {
  const a = await getPerformanceAnalytics(contractorId, rangeDays)

  const revenueEmpty = a.revenueSeries.every((d) => d.won === 0 && d.quoted === 0)

  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-[1.111vw]">
        <OverviewStat
          label="Win rate"
          value={`${Math.round(a.kpis.winRate.value)}%`}
          hint="of quotes accepted"
          delta={ppDelta(a.kpis.winRate.value, a.kpis.winRate.prev)}
          series={a.winsSpark}
        />
        <OverviewStat
          label="Revenue won"
          value={money(a.kpis.revenueWon.value)}
          hint="from accepted quotes"
          delta={pctDelta(a.kpis.revenueWon.value, a.kpis.revenueWon.prev)}
          series={a.revenueSpark}
          delayMs={60}
        />
        <OverviewStat
          label="Leads"
          value={a.kpis.leads.value}
          hint="received this period"
          delta={pctDelta(a.kpis.leads.value, a.kpis.leads.prev)}
          series={a.leadsSpark}
          delayMs={120}
        />
        <OverviewStat
          label="Cost per win"
          value={a.kpis.costPerWin.value != null ? a.kpis.costPerWin.value : "—"}
          hint="credits per won job"
          delayMs={180}
        />
      </div>

      {/* Hero: win & revenue over time */}
      <ChartCard
        title="Win & revenue over time"
        purpose="Value you won versus everything you quoted. The gap is money still on the table."
        right={
          <div className="flex gap-3 lg:gap-[0.833vw]">
            <Swatch color="primary" label="Won" />
            <Swatch dashed label="Quoted" />
          </div>
        }
        empty={revenueEmpty}
        emptyText="Send a quote and win it to watch your revenue build here."
      >
        <AreaLineChart
          series={a.revenueSeries.map((d) => ({ x: d.x, y: d.won }))}
          compare={a.revenueSeries.map((d) => ({ x: d.x, y: d.quoted }))}
          seriesName="Won"
          compareName="Quoted"
          format="currency"
        />
      </ChartCard>
    </div>
  )
}
