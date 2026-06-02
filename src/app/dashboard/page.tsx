import { Suspense } from "react"
import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import {
  getContractorForUser,
  getContractorLeads,
  getDashboardStats,
  getSetupStatus,
  type Contractor,
} from "@/lib/data/dashboard"
import { getVerificationState } from "@/lib/contractor/verification"
import { StatCard } from "@/components/dashboard/stat-card"
import { SetupChecklist } from "@/components/dashboard/setup-checklist"
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

  const setup = await getSetupStatus(contractor.id)
  const verification = getVerificationState(contractor)
  const checklist = [
    {
      label: "Verify your business (license + insurance)",
      done: verification === "verified",
      href: "/dashboard/profile",
    },
    { label: "List the roofing work you do", done: setup.hasServices, href: "/onboarding" },
    { label: "Add your service area", done: setup.hasAreas, href: "/onboarding" },
    { label: "Add a company logo", done: Boolean(contractor.logoUrl), href: "/dashboard/profile" },
  ]
  const setupComplete =
    verification === "verified" && setup.hasServices && setup.hasAreas

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sebenta text-2xl font-bold tracking-tight">
            {contractor.companyName ?? "Your dashboard"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here’s what’s happening with your leads and jobs.
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Buy credits
        </Link>
      </header>

      {!setupComplete && <SetupChecklist items={checklist} />}

      <Suspense fallback={<StatsSkeleton />}>
        <StatsRow contractor={contractor} />
      </Suspense>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Suspense fallback={<LeadsSkeleton />}>
          <RecentLeads contractorId={contractor.id} />
        </Suspense>
        <WalletCard contractor={contractor} />
      </div>
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
        label="Credits"
        value={contractor.creditBalance}
        hint="Spent when you win"
        tint="bg-secondary/70 text-secondary-foreground"
        icon={<CoinIcon />}
      />
    </div>
  )
}

async function RecentLeads({ contractorId }: { contractorId: string }) {
  const leads = await getContractorLeads(contractorId)
  const recent = leads.slice(0, 5)

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
        <div className="mt-4 space-y-3">
          {recent.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </section>
  )
}

function WalletCard({ contractor }: { contractor: Contractor }) {
  const score = Math.max(0, Math.min(100, contractor.profileScore))
  return (
    <aside className="space-y-5 rounded-2xl border border-border bg-card p-5">
      <div>
        <p className="text-sm text-muted-foreground">Credit balance</p>
        <p className="mt-1 font-sebenta text-4xl font-bold tracking-tight tabular-nums">
          {contractor.creditBalance}
        </p>
        <Link
          href="/dashboard/settings"
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          Buy credits
        </Link>
        <p className="mt-2 text-xs text-muted-foreground">
          Leads are free to receive. Credits are spent when you engage and win.
        </p>
      </div>

      <div className="border-t border-border pt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Profile score</span>
          <span className="font-semibold tabular-nums">{score}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-secondary"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-5 text-sm">
        <span className="text-muted-foreground">Verification</span>
        <VerificationBadge status={contractor.verificationStatus} />
      </div>
    </aside>
  )
}

function VerificationBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    verified: {
      label: "Verified",
      cls: "bg-secondary text-secondary-foreground",
    },
    pending: {
      label: "In review",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    },
    rejected: {
      label: "Action needed",
      cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    },
  }
  const v = map[status] ?? map.pending
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${v.cls}`}
    >
      {v.label}
    </span>
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
      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
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

function CoinIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 5.6v6.8M7.2 7.1c0-.8.8-1.3 1.8-1.3s1.8.5 1.8 1.3-0.8 1.2-1.8 1.2-1.8.5-1.8 1.3.8 1.3 1.8 1.3 1.8-.5 1.8-1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

