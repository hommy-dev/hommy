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
import { cn } from "@/lib/utils"

export default async function AdminDashboardPage() {
  await getRequiredUser("admin")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-sebenta text-2xl font-bold tracking-tight">
          Admin console
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
    <div className="grid gap-4 sm:grid-cols-3">
      <Link href="/admin/verification" className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <StatCard
          label="Pending verification"
          value={stats.pendingVerifications}
          hint="Companies awaiting review"
          tint="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          icon={<Icon name="shield-fail" className="size-[18px]" />}
        />
      </Link>
      <StatCard
        label="Verified"
        value={stats.verifiedContractors}
        hint="Live, can engage leads"
        tint="bg-secondary/70 text-secondary-foreground"
        icon={<Icon name="shield-done" className="size-[18px]" />}
      />
      <StatCard
        label="Total companies"
        value={stats.totalContractors}
        hint="All registered contractors"
        tint="bg-foreground/5 text-foreground"
        icon={<Icon name="user-3" className="size-[18px]" />}
      />
    </div>
  )
}

async function RecentContractors() {
  const rows = await getRecentContractors()

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent companies</h2>
        <Link
          href="/admin/contractors"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No companies yet.
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0 truncate text-sm font-medium">
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
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
        v.cls,
      )}
    >
      {v.label}
    </span>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-[108px] rounded-2xl" />
      ))}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-5 w-40" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
