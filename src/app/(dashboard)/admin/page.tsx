import { Suspense } from "react"
import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import {
  getAdminStats,
  getRecentContractors,
  type RecentContractor,
} from "@/lib/data/admin"
import { StatCard } from "@/components/dashboard/stat-card"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

export default async function AdminDashboardPage() {
  await getRequiredUser("admin")

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Admin console
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Verify contractors, monitor leads, and keep the marketplace healthy.
        </p>
      </header>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsRow />
      </Suspense>

      <Suspense fallback={<ListSkeleton />}>
        <RecentContractors />
      </Suspense>
    </div>
  )
}

async function StatsRow() {
  const stats = await getAdminStats()
  return (
    <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-3">
      <Link href="/admin/verification" className="rounded-2xl lg:rounded-[1.111vw] outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <StatCard
          label="Pending verification"
          value={stats.pendingVerifications}
          hint="Companies awaiting review"
          tint="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          icon={<Icon name="shield-fail" className="size-[18px] lg:size-[1.25vw]" />}
        />
      </Link>
      <StatCard
        label="Verified"
        value={stats.verifiedContractors}
        hint="Live, can engage leads"
        tint="bg-secondary/70 text-secondary-foreground"
        icon={<Icon name="shield-done" className="size-[18px] lg:size-[1.25vw]" />}
      />
      <StatCard
        label="Total companies"
        value={stats.totalContractors}
        hint="All registered contractors"
        tint="bg-foreground/5 text-foreground"
        icon={<Icon name="user-3" className="size-[18px] lg:size-[1.25vw]" />}
      />
    </div>
  )
}

async function RecentContractors() {
  const rows = await getRecentContractors()

  return (
    <section className="rounded-2xl lg:rounded-[1.111vw] border border-border bg-card p-5 lg:p-[1.389vw]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm lg:text-[0.972vw] font-semibold">Recent companies</h2>
        <Link
          href="/admin/contractors"
          className="text-sm lg:text-[0.972vw] font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          size="sm"
          icon="work"
          title="No companies yet"
          description="New companies will show up here as they sign up to Homei."
          className="mt-4 lg:mt-[1.111vw]"
        />
      ) : (
        <ul className="mt-4 lg:mt-[1.111vw] divide-y divide-border">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 lg:gap-[0.833vw] py-3 lg:py-[0.833vw]">
              <span className="min-w-0 truncate text-sm lg:text-[0.972vw] font-medium">
                {c.companyName ?? "Unnamed company"}
              </span>
              <VerificationBadge status={c.verificationStatus} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function VerificationBadge({
  status,
}: {
  status: RecentContractor["verificationStatus"]
}) {
  const map: Record<RecentContractor["verificationStatus"], { label: string; cls: string }> = {
    verified: {
      label: "Verified",
      cls: "bg-secondary text-secondary-foreground",
    },
    pending: {
      label: "Pending",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    },
    rejected: {
      label: "Rejected",
      cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    },
  }
  const v = map[status]
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 lg:px-[0.694vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-semibold",
        v.cls,
      )}
    >
      {v.label}
    </span>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-[108px] lg:h-[7.5vw] rounded-2xl lg:rounded-[1.111vw]" />
      ))}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="rounded-2xl lg:rounded-[1.111vw] border border-border bg-card p-5 lg:p-[1.389vw]">
      <Skeleton className="h-5 lg:h-[1.389vw] w-40 lg:w-[11.111vw]" />
      <div className="mt-4 lg:mt-[1.111vw] space-y-3 lg:space-y-[0.833vw]">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 lg:h-[2.222vw] rounded-lg lg:rounded-[0.694vw]" />
        ))}
      </div>
    </div>
  )
}
