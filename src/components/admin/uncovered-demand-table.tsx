import { EmptyState } from "@/components/ui/empty-state"
import type { UncoveredDemandRow } from "@/lib/data/admin-recruitment"
import { FindRoofersButton } from "./recruitment-actions"

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })

/** Areas where homeowners posted but no verified contractor covers — recruit here. */
export function UncoveredDemandTable({ demand }: { demand: UncoveredDemandRow[] }) {
  if (demand.length === 0) {
    return (
      <EmptyState
        icon="discovery"
        title="No uncovered demand"
        description="Every posted job has at least one matching roofer. Supply is keeping up with demand."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
      <table className="w-full min-w-[40rem] text-left text-sm lg:text-[0.972vw]">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] font-medium">Area</th>
            <th className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] font-medium">State</th>
            <th className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] font-medium text-right">Waiting jobs</th>
            <th className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] font-medium">Oldest</th>
            <th className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {demand.map((d) => (
            <tr key={`${d.state}-${d.city}`} className="hover:bg-muted/30">
              <td className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] font-medium text-foreground">
                {d.city ?? "Unknown city"}
              </td>
              <td className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-muted-foreground">{d.state ?? "—"}</td>
              <td className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-right font-semibold tabular-nums">
                {d.count}
              </td>
              <td className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-muted-foreground">
                {dateFmt.format(d.oldest)}
              </td>
              <td className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-right">
                <FindRoofersButton lat={d.lat} lng={d.lng} city={d.city} state={d.state} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
