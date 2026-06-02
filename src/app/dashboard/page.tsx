import { Suspense } from "react"
import Link from "next/link"
import { Briefcase01Icon, Target02Icon } from "@hugeicons/core-free-icons"
import { getRequiredUser } from "@/lib/auth/session"
import {
  getContractorForUser,
  getContractorLeads,
  getDashboardStats,
  type Contractor,
} from "@/lib/data/dashboard"
import { StatCard } from "@/components/dashboard/stat-card"
import { LeadCard } from "@/components/dashboard/leads/lead-card"
import { Skeleton } from "@/components/ui/skeleton"

export default async function DashboardPage() {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)

  if (!contractor) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="text-sm text-muted-foreground">
          Your contractor profile isn’t set up yet. Finish onboarding to start
          receiving leads.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {contractor.companyName ?? "Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here’s what’s happening with your leads and projects.
        </p>
      </header>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsRow contractor={contractor} />
      </Suspense>

      <Suspense fallback={<LeadsSkeleton />}>
        <RecentLeads contractorId={contractor.id} />
      </Suspense>
    </div>
  )
}

async function StatsRow({ contractor }: { contractor: Contractor }) {
  const stats = await getDashboardStats(contractor.id)
  const rating = contractor.avgRating
    ? parseFloat(contractor.avgRating).toFixed(2)
    : "—"
  const planLabel = contractor.plan
    ? contractor.plan[0].toUpperCase() + contractor.plan.slice(1)
    : "No plan"

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Assigned leads"
        value={stats.assignedLeads}
        icon={Target02Icon}
      />
      <StatCard
        label="Active projects"
        value={stats.activeProjects}
        icon={Briefcase01Icon}
      />
      <StatCard
        label="Avg rating"
        value={rating}
        hint={`${contractor.totalReviews} review${
          contractor.totalReviews === 1 ? "" : "s"
        }`}
      />
      <StatCard
        label="Plan"
        value={planLabel}
        hint={`${contractor.leadsUsedThisMonth} leads used this month`}
      />
    </div>
  )
}

async function RecentLeads({ contractorId }: { contractorId: string }) {
  const leads = await getContractorLeads(contractorId)
  const recent = leads.slice(0, 4)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Recent leads
        </h2>
        <Link
          href="/dashboard/leads"
          prefetch
          className="text-sm text-foreground hover:underline"
        >
          View all
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No leads yet. New exclusive leads will appear here the moment they’re
          assigned.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {recent.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </section>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[92px] rounded-xl" />
      ))}
    </div>
  )
}

function LeadsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-lg" />
      ))}
    </div>
  )
}
