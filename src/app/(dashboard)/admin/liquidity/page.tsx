import type { ReactNode } from "react"
import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import { roofingServiceId } from "@/lib/data/locations"
import { getLiquidityOverview } from "@/lib/data/liquidity"
import { StatCard } from "@/components/dashboard/stat-card"
import { Icon } from "@/components/ui/icon"
import { EmptyState } from "@/components/ui/empty-state"
import { FunnelChart } from "@/components/ui/charts/funnel-chart"
import { AreaLineChart } from "@/components/ui/charts/area-line-chart"
import { BarList } from "@/components/ui/charts/bar-list"

const pct = (x: number) => `${Math.round(x * 100)}%`

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—"
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  const h = seconds / 3600
  return h < 48 ? `${h.toFixed(1)}h` : `${Math.round(h / 24)}d`
}

export default async function AdminLiquidityPage() {
  await getRequiredUser("admin")
  const serviceId = (await roofingServiceId()) ?? undefined
  const { funnel, kpis, timeseries, byCity, windowDays } = await getLiquidityOverview({ serviceId })

  const series = timeseries.map((t) => ({ x: t.label, y: t.posted }))
  const compare = timeseries.map((t) => ({ x: t.label, y: t.engaged }))
  const cityItems = byCity.map((c) => ({
    label: [c.city, c.state].filter(Boolean).join(", "),
    value: c.posted,
    hint: `${c.posted ? Math.round((c.engaged / c.posted) * 100) : 0}% matched`,
  }))

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">Liquidity</h1>
        <p className="mt-1 lg:mt-[0.278vw] max-w-2xl lg:max-w-[44vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          The marketplace&apos;s heartbeat: of the jobs homeowners post, how many get a roofer
          engaged — and how fast. Last {windowDays} days. This is the number to watch at launch.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:gap-[1.111vw] lg:grid-cols-3">
        <StatCard
          label="Jobs posted"
          value={funnel.posted.toLocaleString()}
          hint={`Last ${windowDays} days`}
          tint="bg-muted text-muted-foreground"
          icon={<Icon name="discovery" className="size-[18px] lg:size-[1.25vw]" />}
        />
        <StatCard
          label="Match rate"
          value={pct(kpis.matchRate)}
          hint={`${funnel.engaged} of ${funnel.posted} got a roofer engaged`}
          tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          icon={<Icon name="tick-square" className="size-[18px] lg:size-[1.25vw]" />}
        />
        <StatCard
          label="Fast match (<4h)"
          value={pct(kpis.fastMatchRate)}
          hint="Engaged within 4 hours of posting"
          tint="bg-secondary/70 text-secondary-foreground"
          icon={<Icon name="activity" className="size-[18px] lg:size-[1.25vw]" />}
        />
        <StatCard
          label="Avg response time"
          value={formatDuration(kpis.avgResponseSeconds)}
          hint="Post → first roofer engages"
          tint="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
          icon={<Icon name="activity" className="size-[18px] lg:size-[1.25vw]" />}
        />
        <StatCard
          label="Won"
          value={funnel.won.toLocaleString()}
          hint={`${pct(kpis.winRate)} of posted jobs awarded`}
          tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          icon={<Icon name="tick-square" className="size-[18px] lg:size-[1.25vw]" />}
        />
        <Link href="/admin/recruitment" className="rounded-md lg:rounded-[0.556vw] outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <StatCard
            label="Awaiting coverage"
            value={kpis.awaiting.toLocaleString()}
            hint="Posted with no roofer in area — recruit"
            tint={
              kpis.awaiting > 0
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                : "bg-muted text-muted-foreground"
            }
            icon={<Icon name="danger-triangle" className="size-[18px] lg:size-[1.25vw]" />}
          />
        </Link>
      </div>

      {funnel.posted === 0 ? (
        <EmptyState
          icon="discovery"
          title="No jobs posted yet"
          description="Once homeowners start posting roofing jobs, this page shows how reliably and quickly they get matched to a roofer."
        />
      ) : (
        <>
          {/* Funnel + trend */}
          <div className="grid gap-4 lg:gap-[1.111vw] lg:grid-cols-2">
            <Panel title="Marketplace funnel" subtitle="Each posted job, by the furthest stage it reached">
              <FunnelChart
                stages={[
                  { label: "Posted", value: funnel.posted, color: "muted" },
                  { label: "Matched (offered)", value: funnel.matched, color: "primary" },
                  { label: "Engaged", value: funnel.engaged, color: "violet" },
                  { label: "Quoted", value: funnel.quoted, color: "lime" },
                  { label: "Won", value: funnel.won, color: "green" },
                ]}
              />
            </Panel>

            <Panel title={`Last 30 days`} subtitle="Jobs posted vs. jobs that got a roofer engaged">
              <AreaLineChart
                series={series}
                compare={compare}
                seriesName="Posted"
                compareName="Engaged"
                color="primary"
              />
            </Panel>
          </div>

          {/* Per-city liquidity */}
          <Panel title="Liquidity by city" subtitle="Where jobs are posted and how well they're getting matched">
            {cityItems.length === 0 ? (
              <p className="text-sm lg:text-[0.903vw] text-muted-foreground">No located jobs yet.</p>
            ) : (
              <BarList items={cityItems} color="primary" />
            )}
          </Panel>
        </>
      )}
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-md lg:rounded-[0.556vw] border border-border bg-card p-5 lg:p-[1.389vw]">
      <div className="mb-4 lg:mb-[1.111vw]">
        <h2 className="text-sm lg:text-[0.972vw] font-semibold text-foreground">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 lg:mt-[0.139vw] text-xs lg:text-[0.764vw] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
