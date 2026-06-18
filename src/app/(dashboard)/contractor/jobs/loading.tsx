import { Skeleton } from "@/components/ui/skeleton"

// Mirrors the Jobs page: header, the tabbed table's tab pills + search, then the
// 7-column table (Homeowner, Work, Location, Status, Quote, Updated, Action).
// Kept structurally faithful to jobs-table.tsx to avoid layout shift.
export default function JobsLoading() {
  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      {/* Header */}
      <div className="space-y-2 lg:space-y-[0.556vw]">
        <Skeleton className="h-8 lg:h-[2.222vw] w-24 lg:w-[7vw]" />
        <Skeleton className="h-4 lg:h-[1.111vw] w-80 lg:w-[28vw]" />
      </div>

      <div className="space-y-4 lg:space-y-[1.111vw]">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 lg:gap-[0.417vw]">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-8 lg:h-[2.222vw] w-20 lg:w-[5.5vw] rounded-md lg:rounded-[0.417vw]"
            />
          ))}
        </div>

        {/* Search */}
        <Skeleton className="h-9 lg:h-[2.5vw] w-full sm:max-w-xs lg:sm:max-w-[20vw] rounded-md lg:rounded-[0.556vw]" />

        {/* Table */}
        <div className="overflow-x-auto rounded-md lg:rounded-[0.556vw] border border-border">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                {["pl-5 lg:pl-[1.528vw]", "", "", "", "", "", "pr-4 lg:pr-[1.111vw] text-right"].map(
                  (pad, i) => (
                    <th
                      key={i}
                      className={`px-3 lg:px-[0.833vw] py-2.5 lg:py-[0.694vw] ${pad}`}
                    >
                      <Skeleton
                        className={`h-3 lg:h-[0.833vw] w-16 lg:w-[4.5vw] ${i === 6 ? "ml-auto" : ""}`}
                      />
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, row) => (
                <tr key={row}>
                  <td className="py-3 lg:py-[0.833vw] pl-5 lg:pl-[1.528vw]">
                    <Skeleton className="h-4 lg:h-[1.111vw] w-32 lg:w-[9vw]" />
                  </td>
                  <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw]">
                    <Skeleton className="h-4 lg:h-[1.111vw] w-24 lg:w-[7vw]" />
                  </td>
                  <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw]">
                    <Skeleton className="h-4 lg:h-[1.111vw] w-28 lg:w-[8vw]" />
                  </td>
                  <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw]">
                    <Skeleton className="h-5 lg:h-[1.389vw] w-16 lg:w-[4.5vw] rounded-full" />
                  </td>
                  <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw]">
                    <Skeleton className="h-4 lg:h-[1.111vw] w-16 lg:w-[4.5vw]" />
                  </td>
                  <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw]">
                    <Skeleton className="h-4 lg:h-[1.111vw] w-20 lg:w-[5.5vw]" />
                  </td>
                  <td className="px-3 lg:px-[0.833vw] py-3 lg:py-[0.833vw] pr-4 lg:pr-[1.111vw]">
                    <Skeleton className="ml-auto h-7 lg:h-[2vw] w-24 lg:w-[7vw] rounded-md lg:rounded-[0.417vw]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
