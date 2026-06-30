import { getRequiredUser } from "@/lib/auth/session"
import { getAdminStormEvents } from "@/lib/data/admin"
import { StormEventsTable } from "@/components/admin/storm-events-table"
import { LogStormButton } from "@/components/admin/log-storm-dialog"
import { EmptyState } from "@/components/ui/empty-state"

export default async function AdminStormEventsPage() {
  await getRequiredUser("admin")
  const events = await getAdminStormEvents()

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header className="flex flex-wrap items-end justify-between gap-4 lg:gap-[1.111vw]">
        <div>
          <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">Storm events</h1>
          <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            Log a storm to pre-position roofers in the area and get a shareable storm-damage quote link.
          </p>
        </div>
        <LogStormButton />
      </header>

      {events.length === 0 ? (
        <EmptyState
          icon="danger-triangle"
          title="No storm events yet"
          description="See hail or wind hit a target area? Log it — we'll discover and invite roofers there and give you a shareable link to pull in homeowners."
        />
      ) : (
        <StormEventsTable events={events} />
      )}
    </div>
  )
}
