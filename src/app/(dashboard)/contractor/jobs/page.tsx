import { Suspense } from "react"
import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import { getContractorForUser } from "@/lib/data/dashboard"
import { getContractorJobs } from "@/lib/data/jobs"
import { canEngageLeads } from "@/lib/contractor/verification"
import { JobsTable } from "@/components/dashboard/jobs/jobs-table"
import { JobsBoardSkeleton } from "@/components/dashboard/skeletons"

export default function JobsPage() {
  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header className="w-full">
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Jobs
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Every lead in one place, from a new request to a finished job. Start a
          chat to win it.
        </p>
      </header>

      <Suspense fallback={<JobsBoardSkeleton />}>
        <JobsData />
      </Suspense>
    </div>
  )
}

async function JobsData() {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return null

  const jobs = await getContractorJobs(contractor.id, user.id)
  const canEngage = canEngageLeads(contractor)

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      {!canEngage && (
        <div className="flex flex-wrap items-center justify-between gap-4 lg:gap-[1.111vw] rounded-2xl lg:rounded-[1.111vw] border border-primary/20 bg-accent/60 p-4 lg:p-[1.111vw]">
          <div className="flex items-start gap-3 lg:gap-[0.833vw]">
            <span className="mt-0.5 lg:mt-[0.139vw] flex size-8 lg:size-[2.222vw] shrink-0 items-center justify-center rounded-lg lg:rounded-[0.694vw] bg-primary/10 text-primary">
              <LockIcon />
            </span>
            <div>
              <p className="text-sm lg:text-[0.972vw] font-semibold">
                Verify your business to respond
              </p>
              <p className="mt-0.5 lg:mt-[0.139vw] text-sm lg:text-[0.972vw] text-foreground/65">
                You can browse leads now, but you’ll need to be verified to chat
                with a homeowner.
              </p>
            </div>
          </div>
          <Link
            href="/contractor/settings/verification"
            className="shrink-0 rounded-full bg-primary px-4 lg:px-[1.111vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Get verified
          </Link>
        </div>
      )}

      <JobsTable jobs={jobs} />
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4.5" y="9" width="11" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 9V6.8a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
