import { Suspense } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import { RangeDropdown } from "@/components/dashboard/analytics/range-dropdown"
import { ALLOWED_RANGES, rangeLabel } from "@/components/dashboard/analytics/ranges"
import { NowKpis } from "@/components/dashboard/analytics/now-kpis"
import { PerformanceSection } from "@/components/dashboard/analytics/performance-section"
import { ReputationSection } from "@/components/dashboard/analytics/reputation-section"
import { Skeleton } from "@/components/ui/skeleton"

function parseRange(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v)
  return ALLOWED_RANGES.includes(n) ? n : 30
}

export default function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsView searchParams={searchParams} />
    </Suspense>
  )
}

async function AnalyticsView({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)
  const { range: rangeParam } = await searchParams
  const range = parseRange(rangeParam)

  if (!contractor) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your company isn’t set up yet. Finish onboarding to start tracking your performance.
      </p>
    )
  }

  const rangeText = rangeLabel(range).toLowerCase()

  return (
    <div className="space-y-8 lg:space-y-[2.222vw]">
      <header className="flex flex-wrap items-end justify-between gap-3 lg:gap-[0.833vw]">
        <div>
          <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            How {contractor.companyName ?? "your company"} is doing over the {rangeText}.
          </p>
        </div>
        <RangeDropdown range={range} />
      </header>

      <section className="space-y-4 lg:space-y-[1.111vw]">
        <h2 className="text-xs lg:text-[0.833vw] font-semibold uppercase tracking-wider text-muted-foreground">Performance</h2>
        <Suspense fallback={<KpiRowSkeleton />}>
          <NowKpis
            contractorId={contractor.id}
            userId={user.id}
            creditBalance={contractor.creditBalance}
            profileScore={contractor.profileScore}
          />
        </Suspense>
        <Suspense key={`perf-${range}`} fallback={<SectionSkeleton />}>
          <PerformanceSection contractorId={contractor.id} rangeDays={range} />
        </Suspense>
      </section>

      <section className="space-y-4 lg:space-y-[1.111vw]">
        <h2 className="text-xs lg:text-[0.833vw] font-semibold uppercase tracking-wider text-muted-foreground">Reputation</h2>
        <Suspense key={`rep-${range}`} fallback={<SectionSkeleton />}>
          <ReputationSection contractorId={contractor.id} rangeDays={range} currentScore={contractor.profileScore} />
        </Suspense>
      </section>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 lg:space-y-[2.222vw]">
      <div className="flex flex-wrap items-end justify-between gap-3 lg:gap-[0.833vw]">
        <div className="space-y-2 lg:space-y-[0.556vw]">
          <Skeleton className="h-8 lg:h-[2.222vw] w-32 lg:w-[10vw]" />
          <Skeleton className="h-4 lg:h-[1.111vw] w-64 lg:w-[20vw]" />
        </div>
        <Skeleton className="h-9 lg:h-[2.5vw] w-32 lg:w-[9vw] rounded-md lg:rounded-[0.556vw]" />
      </div>
      <KpiRowSkeleton />
      <SectionSkeleton />
    </div>
  )
}

function KpiRowSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-[1.111vw]">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[150px] lg:h-[10.5vw] rounded-xl lg:rounded-[0.833vw]" />
      ))}
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-[1.111vw]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-[1.111vw]">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[150px] lg:h-[10.5vw] rounded-xl lg:rounded-[0.833vw]" />
        ))}
      </div>
      <Skeleton className="h-72 lg:h-[20vw] rounded-xl lg:rounded-[0.833vw]" />
      <div className="grid gap-4 lg:gap-[1.111vw] lg:grid-cols-2">
        <Skeleton className="h-64 lg:h-[18vw] rounded-xl lg:rounded-[0.833vw]" />
        <Skeleton className="h-64 lg:h-[18vw] rounded-xl lg:rounded-[0.833vw]" />
      </div>
    </div>
  )
}
