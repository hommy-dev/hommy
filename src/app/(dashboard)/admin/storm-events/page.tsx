import { getRequiredUser } from "@/lib/auth/session"
import { getAdminStormEvents } from "@/lib/data/admin"
import { StormEventsTable } from "@/components/admin/storm-events-table"
import { EmptyState } from "@/components/ui/empty-state"

export default async function AdminStormEventsPage() {
  await getRequiredUser("admin")
  const events = await getAdminStormEvents()

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header>
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">Storm events</h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Severe-weather events and the alerts and leads generated from them.
        </p>
      </header>

      {events.length === 0 ? (
        <EmptyState
          icon="danger-triangle"
          title="No storm events yet"
          description="When the weather poll detects severe storms, they'll be logged here with the alerts and leads they triggered."
        />
      ) : (
        <StormEventsTable events={events} />
      )}
    </div>
  )
}
