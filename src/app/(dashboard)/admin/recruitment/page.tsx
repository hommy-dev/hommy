import { getRequiredUser } from "@/lib/auth/session"
import { getUncoveredDemand } from "@/lib/data/admin-recruitment"
import { EmptyState } from "@/components/ui/empty-state"
import { FindRoofersButton, ExportProspectsButton } from "@/components/admin/recruitment-actions"

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })

export default async function AdminRecruitmentPage() {
  await getRequiredUser("admin")
  const demand = await getUncoveredDemand()
  const totalLeads = demand.reduce((n, d) => n + d.count, 0)

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header className="flex flex-wrap items-end justify-between gap-4 lg:gap-[1.111vw]">
        <div>
          <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
            Recruitment
          </h1>
          <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
            Where homeowners posted jobs but no verified contractor covers the area. Recruit roofers
            here, the waiting jobs auto-match the moment one verifies.
          </p>
        </div>
        <ExportProspectsButton />
      </header>

      {demand.length === 0 ? (
        <EmptyState
          icon="discovery"
          title="No uncovered demand"
          description="Every posted job has at least one matching roofer. Nice — supply is keeping up with demand."
        />
      ) : (
        <>
          <p className="text-sm lg:text-[0.972vw] text-muted-foreground">
            <span className="font-semibold text-foreground">{totalLeads}</span> waiting job
            {totalLeads === 1 ? "" : "s"} across{" "}
            <span className="font-semibold text-foreground">{demand.length}</span> area
            {demand.length === 1 ? "" : "s"}.
          </p>
          <div className="overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border">
            <table className="w-full text-sm lg:text-[0.972vw]">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] font-medium">Area</th>
                  <th className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] font-medium">State</th>
                  <th className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] font-medium text-right">
                    Waiting jobs
                  </th>
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
                    <td className="px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] text-muted-foreground">
                      {d.state ?? "—"}
                    </td>
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
        </>
      )}
    </div>
  )
}
