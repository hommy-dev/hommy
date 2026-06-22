import { Suspense } from "react"
import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser, type Contractor } from "@/lib/data/dashboard"
import { getContractorOverview } from "@/lib/data/overview"
import { creditStatView } from "@/lib/credits/stat"
import { getVerificationState } from "@/lib/contractor/verification"
import { scoreStanding } from "@/lib/reputation/labels"
import { SetupGate } from "@/components/dashboard/setup-gate"
import { OverviewStat } from "@/components/dashboard/overview/overview-stat"
import { OverviewFeed, type ActionRow } from "@/components/dashboard/overview/overview-feed"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"

// Below this, a company can't even engage a lead (engage costs 5), so nudge them.
const LOW_CREDIT_BALANCE = 5

export default function OverviewPage() {
  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header className="flex flex-wrap items-end justify-between gap-3 lg:gap-[0.833vw]">
        <Suspense fallback={<WelcomeFallback />}>
          <WelcomeHeader />
        </Suspense>
        <Button asChild variant="outline" className="shrink-0 gap-1.5 lg:gap-[0.417vw]">
          <Link href="/contractor/jobs">
            <Icon name="work" className="size-4 lg:size-[1.111vw]" />
            View jobs
          </Link>
        </Button>
      </header>

      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewSection />
      </Suspense>
    </div>
  )
}

function WelcomeFallback() {
  return (
    <div>
      <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight sm:text-3xl">
        Welcome back
      </h1>
      <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
        Here’s your company at a glance.
      </p>
    </div>
  )
}

async function WelcomeHeader() {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)
  const firstName = user.fullName?.trim().split(/\s+/)[0] ?? "there"
  return (
    <div>
      <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight sm:text-3xl">
        Welcome back, {firstName}
      </h1>
      {contractor ? (
        <Suspense fallback={<p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">Here’s your company at a glance.</p>}>
          <GreetingLine contractorId={contractor.id} userId={user.id} />
        </Suspense>
      ) : null}
    </div>
  )
}

async function OverviewSection() {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)

  if (!contractor) {
    return (
      <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
        Your contractor profile isn’t set up yet. Finish onboarding to start receiving leads.
      </p>
    )
  }

  const firstName = user.fullName?.trim().split(/\s+/)[0] ?? "there"
  const verification = getVerificationState(contractor)
  const needsSetup = verification === "not_started" || verification === "rejected"

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
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
      <OverviewContent contractor={contractor} userId={user.id} firstName={firstName} />
    </div>
  )
}

async function GreetingLine({ contractorId, userId }: { contractorId: string; userId: string }) {
  const { newLeadsWaiting, quotesAwaiting } = await getContractorOverview(contractorId, userId)
  const bits: string[] = []
  if (newLeadsWaiting > 0) bits.push(`${newLeadsWaiting} lead${newLeadsWaiting === 1 ? "" : "s"} waiting`)
  if (quotesAwaiting > 0) bits.push(`${quotesAwaiting} quote${quotesAwaiting === 1 ? "" : "s"} out`)
  const line =
    bits.length > 0 ? `You’ve got ${bits.join(" and ")}.` : "You’re all set for today. Nothing’s waiting on you."
  return <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">{line}</p>
}

async function OverviewContent({
  contractor,
  userId,
  firstName,
}: {
  contractor: Contractor
  userId: string
  firstName: string
}) {
  const o = await getContractorOverview(contractor.id, userId)
  const balance = contractor.creditBalance
  const standing = scoreStanding(contractor.profileScore)
  const credits = creditStatView(balance, o.creditsTrend7d)

  // Build the prioritized action list (most urgent first).
  const actions: ActionRow[] = []
  if (balance < 0) {
    actions.push({
      key: "arrears",
      icon: "wallet",
      tone: "destructive",
      title: "Your balance is negative",
      subtitle: `You owe ${Math.abs(balance)} credits. Top up to keep engaging new leads.`,
      href: "/contractor/settings/billing",
      cta: "Add credits",
    })
  } else if (balance < LOW_CREDIT_BALANCE) {
    actions.push({
      key: "low-credits",
      icon: "wallet",
      tone: "warning",
      title: "Low credit balance",
      subtitle: `Just ${balance} credit${balance === 1 ? "" : "s"} left, not enough to engage a new lead.`,
      href: "/contractor/settings/billing",
      cta: "Add credits",
    })
  }
  if (o.newLeadsWaiting > 0) {
    actions.push({
      key: "new-leads",
      icon: "discovery",
      tone: "primary",
      title: `${o.newLeadsWaiting} new lead${o.newLeadsWaiting === 1 ? "" : "s"} near you`,
      subtitle: "Engage early to land the job before anyone else does.",
      href: "/contractor/jobs",
      cta: "View",
    })
  }
  if (o.quotesAwaiting > 0) {
    actions.push({
      key: "quotes",
      icon: "paper",
      tone: "neutral",
      title: `${o.quotesAwaiting} quote${o.quotesAwaiting === 1 ? "" : "s"} awaiting a reply`,
      subtitle: "Homeowners are deciding right now, so a quick nudge can help.",
      href: "/contractor/jobs",
      cta: "View",
    })
  }
  if (o.unreadConversations > 0) {
    actions.push({
      key: "unread",
      icon: "chat",
      tone: "primary",
      title: `${o.unreadConversations} unread conversation${o.unreadConversations === 1 ? "" : "s"}`,
      subtitle: "Quick replies keep deals moving and lift your score.",
      href: "/contractor/messages",
      cta: "Open",
    })
  }

  const upDown = (n: number, label: string) =>
    n > 0
      ? { label: `${n} ${label}`, dir: "up" as const }
      : n < 0
        ? { label: `${Math.abs(n)} ${label}`, dir: "down" as const }
        : undefined

  return (
    <div className="space-y-8 lg:space-y-[2.222vw]">
      {/* Headline KPIs */}
      <div className="grid gap-4 lg:gap-[1.111vw] grid-cols-2 lg:grid-cols-4">
        <OverviewStat
          label="Open offers"
          value={o.openOffers}
          hint="Waiting on you"
          href="/contractor/jobs"
          delta={o.offersTrend7d > 0 ? { label: `${o.offersTrend7d} this week`, dir: "up" } : undefined}
          series={o.offersSeries}
          delayMs={0}
        />
        <OverviewStat
          label="Active jobs"
          value={o.activeJobs}
          hint="In your pipeline"
          href="/contractor/jobs"
          delta={o.jobsTrend7d > 0 ? { label: `${o.jobsTrend7d} this week`, dir: "up" } : undefined}
          series={o.jobsSeries}
          delayMs={60}
        />
        <OverviewStat
          label="Credits"
          value={balance}
          hint={credits.hint}
          tone={credits.tone}
          href="/contractor/settings/billing"
          delta={credits.delta}
          series={o.creditsSeries}
          delayMs={120}
        />
        <OverviewStat
          label="Standing"
          value={contractor.profileScore}
          hint={standing.label}
          href="/contractor/analytics"
          delta={upDown(o.standingTrend7d, "this week")}
          series={o.standingSeries}
          delayMs={180}
        />
      </div>

      {/* Unified feed: what needs you + what just happened */}
      <OverviewFeed actions={actions} activity={o.recentActivity} firstName={firstName} />
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <div className="grid gap-4 lg:gap-[1.111vw] grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[180px] lg:h-[12.5vw] rounded-xl lg:rounded-[0.833vw]" />
        ))}
      </div>
      <Skeleton className="h-80 lg:h-[24vw] rounded-xl lg:rounded-[0.833vw]" />
    </div>
  )
}
