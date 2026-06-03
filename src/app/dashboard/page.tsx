import { Suspense } from "react"
import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import {
  getContractorForUser,
  getContractorLeads,
  getDashboardStats,
  type Contractor,
} from "@/lib/data/dashboard"
import { getVerificationState } from "@/lib/contractor/verification"
import { StatCard } from "@/components/dashboard/stat-card"
import { SetupGate } from "@/components/dashboard/setup-gate"
import { LeadCard } from "@/components/dashboard/leads/lead-card"
import { Skeleton } from "@/components/ui/skeleton"

export default async function DashboardPage() {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)

  if (!contractor) {
    return (
      <p className="text-sm text-muted-foreground">
        Your contractor profile isn’t set up yet. Finish onboarding to start
        receiving leads.
      </p>
    )
  }

  const verification = getVerificationState(contractor)
  const needsSetup = verification === "not_started" || verification === "rejected"

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-sebenta text-2xl font-bold tracking-tight">
          {contractor.companyName ?? "Your dashboard"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here’s what’s happening with your leads and jobs.
        </p>
      </header>

      {needsSetup && (
        <SetupGate
          initial={{
            logoUrl: contractor.logoUrl,
            companyName: contractor.companyName ?? "",
            phone: user.phone ?? "",
            bio: contractor.bio ?? "",
            licenseDocUrl: contractor.licenseDocUrl,
            insuranceDocUrl: contractor.insuranceDocUrl,
          }}
        />
      )}

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
    ? parseFloat(contractor.avgRating).toFixed(1)
    : "—"

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Open offers"
        value={stats.openOffers}
        hint="Leads waiting on you"
        tint="bg-primary/10 text-primary"
        icon={<TargetIcon />}
      />
      <StatCard
        label="Active projects"
        value={stats.activeProjects}
        hint="In your pipeline now"
        tint="bg-foreground/5 text-foreground"
        icon={<BriefcaseIcon />}
      />
      <StatCard
        label="Avg rating"
        value={rating}
        hint={`${contractor.totalReviews} review${contractor.totalReviews === 1 ? "" : "s"}`}
        tint="bg-tertiary/15 text-[#b23a5e]"
        icon={<StarIcon />}
      />
      <StatCard
        label="Profile score"
        value={contractor.profileScore}
        hint="Higher score, more leads"
        tint="bg-secondary/70 text-secondary-foreground"
        icon={<TrendIcon />}
      />
    </div>
  )
}

async function RecentLeads({ contractorId }: { contractorId: string }) {
  const leads = await getContractorLeads(contractorId)
  const recent = leads.slice(0, 6)

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent leads</h2>
        <Link
          href="/dashboard/leads"
          prefetch
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No leads yet. New offers will appear here the moment they’re sent your
          way.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
        <Skeleton key={i} className="h-[108px] rounded-2xl" />
      ))}
    </div>
  )
}

function LeadsSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-5 w-32" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

function TargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="0.9" fill="currentColor" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="6.5" width="14" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 6.5v-1A1.5 1.5 0 0 1 8.5 4h3A1.5 1.5 0 0 1 13 5.5v1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10.5h14" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1l1.9 4 4.1.5-3 2.9.8 4.1L8 10.6 4.2 12.5l.8-4.1-3-2.9 4.1-.5L8 1z" />
    </svg>
  )
}

function TrendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 13l4-4 3 3 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6h4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
