import { getRequiredUser } from "@/lib/auth/session"
import {
  getContractorForUser,
  getContractorLeads,
} from "@/lib/data/dashboard"
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your exclusive assigned leads. Respond fast — speed wins the job.
        </p>
      </header>
      <LeadsInbox leads={leads} />
    </div>
  )
}
