import { getRequiredUser } from "@/lib/auth/session"
import { getAdminLeads } from "@/lib/data/admin"
import { LeadsTable } from "@/components/admin/leads-table"
import { EmptyState } from "@/components/ui/empty-state"

export default async function AdminLeadsPage() {
  await getRequiredUser("admin")
  const leads = await getAdminLeads()

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">Leads</h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Every homeowner request across the marketplace, with fan-out and engagement at a glance.
        </p>
      </header>

      {leads.length === 0 ? (
        <EmptyState
          icon="discovery"
          title="No leads yet"
          description="Homeowner job posts will show up here as they come in."
        />
      ) : (
        <LeadsTable leads={leads} />
      )}
    </div>
  )
}
