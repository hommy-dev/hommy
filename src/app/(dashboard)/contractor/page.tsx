import { Suspense } from "react";
import Link from "next/link";
import { getRequiredUser } from "@/lib/auth/session";
import {
  getContractorForUser,
  getContractorLeads,
  getDashboardStats,
  type Contractor,
} from "@/lib/data/dashboard";
import { getVerificationState } from "@/lib/contractor/verification";
import { StatCard } from "@/components/dashboard/stat-card";
import { SetupGate } from "@/components/dashboard/setup-gate";
import { LeadCard } from "@/components/dashboard/leads/lead-card";
import { Skeleton } from "@/components/ui/skeleton";

export default async function DashboardPage() {
  const user = await getRequiredUser("contractor");
  const contractor = await getContractorForUser(user.id);

  if (!contractor) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your contractor profile isn’t set up yet. Finish onboarding to start
        receiving leads.
      </p>
    );
  }

  const verification = getVerificationState(contractor);
  const needsSetup =
    verification === "not_started" || verification === "rejected";

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header className="relative overflow-hidden rounded-lg lg:rounded-[0.694vw]">
        {/* background image */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/bg/1.jpg)" }}
        />
        {/* dark scrim: solid behind the text on the left, fading to clear on the
            right so the image still reads. Fixed dark (not --foreground, which
            inverts in dark mode) keeps the white text legible in both themes. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-r from-black/85 via-black/55 to-transparent"
        />
        <div className="relative flex min-h-52 lg:min-h-[14.445vw] flex-col justify-end p-6 lg:p-[1.667vw] sm:p-8">
          <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight text-white sm:text-3xl">
            {contractor.companyName ?? "Your dashboard"}
          </h1>
          <p className="mt-1.5 lg:mt-[0.417vw] max-w-md lg:max-w-[31.108vw] text-sm lg:text-[0.972vw] text-white/75">
            Here’s what’s happening with your leads and jobs.
          </p>
        </div>
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
  );
}

async function StatsRow({ contractor }: { contractor: Contractor }) {
  const stats = await getDashboardStats(contractor.id);
  const rating = contractor.avgRating
    ? parseFloat(contractor.avgRating).toFixed(1)
    : "—";

  return (
    <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2 lg:grid-cols-4">
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
  );
}

async function RecentLeads({ contractorId }: { contractorId: string }) {
  const leads = await getContractorLeads(contractorId);
  const recent = leads.slice(0, 6);

  return (
    <section className="rounded-md lg:rounded-[0.556vw] border border-border bg-card p-5 lg:p-[1.389vw]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm lg:text-[0.972vw] font-semibold">Recent leads</h2>
        <Link
          href="/contractor/leads"
          prefetch
          className="text-sm lg:text-[0.972vw] font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className="mt-4 lg:mt-[1.111vw] rounded-xl lg:rounded-[0.926vw] border border-dashed border-border p-10 lg:p-[2.778vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
          No leads yet. New offers will appear here the moment they’re sent your
          way.
        </div>
      ) : (
        <div className="mt-4 lg:mt-[1.111vw] grid gap-3 lg:gap-[0.833vw] sm:grid-cols-2">
          {recent.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </section>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[108px] lg:h-[7.5vw] rounded-2xl lg:rounded-[1.111vw]" />
      ))}
    </div>
  );
}

function LeadsSkeleton() {
  return (
    <div className="rounded-2xl lg:rounded-[1.111vw] border border-border bg-card p-5 lg:p-[1.389vw]">
      <Skeleton className="h-5 lg:h-[1.389vw] w-32 lg:w-[8.889vw]" />
      <div className="mt-4 lg:mt-[1.111vw] grid gap-3 lg:gap-[0.833vw] sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 lg:h-[7.778vw] rounded-lg lg:rounded-[0.694vw]" />
        ))}
      </div>
    </div>
  );
}

function TargetIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="0.9" fill="currentColor" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="6.5"
        width="14"
        height="9.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M7 6.5v-1A1.5 1.5 0 0 1 8.5 4h3A1.5 1.5 0 0 1 13 5.5v1"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M3 10.5h14" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 1l1.9 4 4.1.5-3 2.9.8 4.1L8 10.6 4.2 12.5l.8-4.1-3-2.9 4.1-.5L8 1z" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 13l4-4 3 3 6-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 6h4v4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
