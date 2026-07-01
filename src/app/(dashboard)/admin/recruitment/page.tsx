import type { ReactNode } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { roofingServiceId } from "@/lib/data/locations"
import {
  getRecruitmentOverview,
  getStreamSendStatus,
  listProspects,
  getUncoveredDemand,
  getEnrichmentErrors,
} from "@/lib/data/admin-recruitment"
import { StatCard } from "@/components/dashboard/stat-card"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { FunnelChart } from "@/components/ui/charts/funnel-chart"
import { DonutChart, type DonutSlice } from "@/components/ui/charts/donut-chart"
import { AreaLineChart } from "@/components/ui/charts/area-line-chart"
import type { ChartColor } from "@/components/ui/charts/palette"
import { ExportProspectsButton } from "@/components/admin/recruitment-actions"
import { RecruitmentTabs } from "@/components/admin/recruitment-dashboard"
import { ProspectsTable } from "@/components/admin/prospects-table"
import { UncoveredDemandTable } from "@/components/admin/uncovered-demand-table"
import { EnrichmentErrorsTable } from "@/components/admin/enrichment-errors-table"

const pct = (x: number) => `${Math.round(x * 100)}%`

// Outreach status → label + chart color for the donut.
const OUTREACH_META: Record<string, { label: string; color: ChartColor }> = {
  pending: { label: "Pending", color: "muted" },
  exported: { label: "Exported", color: "primary" },
  sent: { label: "Sent", color: "primary" },
  opened: { label: "Opened", color: "violet" },
  clicked: { label: "Clicked", color: "violet" },
  replied: { label: "Replied", color: "lime" },
  converted: { label: "Converted", color: "green" },
  bounced: { label: "Bounced", color: "red" },
  suppressed: { label: "Suppressed", color: "orange" },
  skipped: { label: "Skipped", color: "muted" },
}

export default async function AdminRecruitmentPage() {
  await getRequiredUser("admin")
  const serviceId = (await roofingServiceId()) ?? undefined

  const [overview, sendStatus, prospects, demand, errors] = await Promise.all([
    getRecruitmentOverview(serviceId),
    getStreamSendStatus(),
    listProspects({ serviceId, limit: 200 }),
    getUncoveredDemand(),
    getEnrichmentErrors(50, serviceId),
  ])

  const { kpis, funnel, lost, enrichmentJobs, timeseries } = overview

  const donutSlices: DonutSlice[] = overview.outreachBreakdown
    .map((b) => ({
      label: OUTREACH_META[b.status]?.label ?? b.status,
      value: b.count,
      color: OUTREACH_META[b.status]?.color ?? "muted",
    }))
    .sort((a, b) => b.value - a.value)

  const series = timeseries.map((t) => ({ x: t.label, y: t.discovered }))
  const compare = timeseries.map((t) => ({ x: t.label, y: t.emailed }))

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header className="flex flex-wrap items-end justify-between gap-4 lg:gap-[1.111vw]">
        <div>
          <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">Recruitment</h1>
          <p className="mt-1 lg:mt-[0.278vw] max-w-2xl lg:max-w-[44vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            The contractor supply funnel: discover roofers for uncovered areas, find their email, reach
            out, and onboard them. Waiting jobs auto-match the moment one verifies.
          </p>
        </div>
        <ExportProspectsButton />
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:gap-[1.111vw] lg:grid-cols-5">
        <StatCard
          label="Prospects"
          value={kpis.totalProspects.toLocaleString()}
          hint="Companies discovered"
          tint="bg-muted text-muted-foreground"
          icon={<Icon name="discovery" className="size-[18px] lg:size-[1.25vw]" />}
        />
        <StatCard
          label="Reachable"
          value={pct(kpis.reachableRate)}
          hint={`${kpis.withEmail.toLocaleString()} have an email`}
          tint="bg-secondary/70 text-secondary-foreground"
          icon={<Icon name="tick-square" className="size-[18px] lg:size-[1.25vw]" />}
        />
        <StatCard
          label="Emails sent"
          value={kpis.emailsSent.toLocaleString()}
          hint="Total outreach touches"
          tint="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
          icon={<Icon name="send" className="size-[18px] lg:size-[1.25vw]" />}
        />
        <StatCard
          label="Converted"
          value={funnel.converted.toLocaleString()}
          hint={`${pct(kpis.conversionRate)} of emailed`}
          tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          icon={<Icon name="user-3" className="size-[18px] lg:size-[1.25vw]" />}
        />
        <StatCard
          label="Enrichment queue"
          value={(enrichmentJobs.queued + enrichmentJobs.processing).toLocaleString()}
          hint={enrichmentJobs.error > 0 ? `${enrichmentJobs.error} errors` : "No errors"}
          tint={
            enrichmentJobs.error > 0
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              : "bg-muted text-muted-foreground"
          }
          icon={<Icon name="danger-triangle" className="size-[18px] lg:size-[1.25vw]" />}
        />
      </div>

      {/* Per-domain sending today (warmup ramp) */}
      <div className="grid grid-cols-1 gap-4 lg:gap-[1.111vw] sm:grid-cols-2">
        {sendStatus.map((s) => {
          const usedPct = Math.min(100, Math.round((s.sentToday / Math.max(1, s.cap)) * 100))
          return (
            <div
              key={s.stream}
              className="rounded-lg lg:rounded-[0.556vw] border bg-card p-4 lg:p-[1.111vw]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm lg:text-[0.972vw] font-medium capitalize">
                  {s.stream} domain
                </span>
                <span className="text-sm lg:text-[0.972vw] tabular-nums text-muted-foreground">
                  {s.sentToday} / {s.cap} sent today
                </span>
              </div>
              <div className="mt-2 lg:mt-[0.556vw] h-2 lg:h-[0.556vw] overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", usedPct >= 100 ? "bg-amber-500" : "bg-primary")}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Funnel + outreach donut */}
      <div className="grid gap-4 lg:gap-[1.111vw] lg:grid-cols-2">
        <Panel title="Acquisition funnel" subtitle="Each stage as a share of all discovered prospects">
          <FunnelChart
            stages={[
              { label: "Discovered", value: funnel.discovered, color: "muted" },
              { label: "Has email", value: funnel.withEmail, color: "primary" },
              { label: "Emailed", value: funnel.emailed, color: "violet" },
              { label: "Converted", value: funnel.converted, color: "green" },
            ]}
          />
          <div className="mt-4 lg:mt-[1.111vw] grid grid-cols-3 gap-3 lg:gap-[0.833vw] border-t border-border pt-4 lg:pt-[1.111vw]">
            <LostStat label="No email" value={lost.noEmail} />
            <LostStat label="Bounced" value={lost.bounced} />
            <LostStat label="Suppressed" value={lost.suppressed} />
          </div>
        </Panel>

        <Panel title="Outreach status" subtitle="Where every prospect sits in the email lifecycle">
          <DonutChart slices={donutSlices} centerValue={kpis.totalProspects.toLocaleString()} centerLabel="prospects" />
          <p className="mt-3 lg:mt-[0.833vw] text-xs lg:text-[0.764vw] text-muted-foreground">
            Open/click tracking is off for deliverability, so those stages stay empty by design.
          </p>
        </Panel>
      </div>

      {/* Trend */}
      <Panel title="Last 30 days" subtitle="Prospects discovered vs. emails sent per day">
        <AreaLineChart
          series={series}
          compare={compare}
          seriesName="Discovered"
          compareName="Emailed"
          color="primary"
        />
      </Panel>

      {/* Enrichment health */}
      <Panel title="Email enrichment health">
        <div className="grid grid-cols-2 gap-3 lg:gap-[0.833vw] sm:grid-cols-4">
          <JobStat label="Queued" value={enrichmentJobs.queued} dot="bg-muted-foreground" />
          <JobStat label="Processing" value={enrichmentJobs.processing} dot="bg-primary" />
          <JobStat label="Done" value={enrichmentJobs.done} dot="bg-success" />
          <JobStat label="Errors" value={enrichmentJobs.error} dot="bg-destructive" />
        </div>
      </Panel>

      {/* Tables */}
      <RecruitmentTabs
        counts={{ prospects: prospects.length, demand: demand.length, errors: errors.length }}
        prospects={<ProspectsTable prospects={prospects} />}
        demand={<UncoveredDemandTable demand={demand} />}
        errors={<EnrichmentErrorsTable rows={errors} />}
      />
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

function LostStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs lg:text-[0.764vw] text-muted-foreground">{label}</p>
      <p className="mt-0.5 lg:mt-[0.139vw] text-lg lg:text-[1.25vw] font-semibold tabular-nums text-foreground">
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function JobStat({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center gap-2.5 lg:gap-[0.694vw] rounded-md lg:rounded-[0.417vw] border border-border px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw]">
      <span className={cn("size-2.5 lg:size-[0.694vw] shrink-0 rounded-full", dot)} />
      <div className="min-w-0">
        <p className="text-xs lg:text-[0.764vw] text-muted-foreground">{label}</p>
        <p className="font-semibold tabular-nums text-foreground">{value.toLocaleString()}</p>
      </div>
    </div>
  )
}
