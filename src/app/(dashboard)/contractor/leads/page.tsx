import Link from "next/link"
import { getRequiredUser } from "@/lib/auth/session"
import {
  getContractorForUser,
  getContractorLeads,
} from "@/lib/data/dashboard"
import { canEngageLeads } from "@/lib/contractor/verification"
import { LeadsInbox } from "@/components/dashboard/leads/leads-inbox"

export default async function LeadsPage() {
  const user = await getRequiredUser("contractor")
  const contractor = await getContractorForUser(user.id)

  if (!contractor) {
    return (
      <p className="text-sm text-muted-foreground">
        Your contractor profile isn’t set up yet.
      </p>
    )
  }

  const leads = await getContractorLeads(contractor.id)
  const canEngage = canEngageLeads(contractor)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-sebenta text-2xl font-bold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Leads offered to you. Respond fast, the first few to engage win the
          job.
        </p>
      </header>

      {!canEngage && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-accent/60 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LockIcon />
            </span>
            <div>
              <p className="text-sm font-semibold">
                Verify your business to respond
              </p>
              <p className="mt-0.5 text-sm text-foreground/65">
                You can browse offers now, but you’ll need to be verified to
                engage a lead.
              </p>
            </div>
          </div>
          <Link
            href="/contractor/profile"
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Get verified
          </Link>
        </div>
      )}

      <LeadsInbox leads={leads} />
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
