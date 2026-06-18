import { Skeleton } from "@/components/ui/skeleton"

// Mirrors the homeowner Jobs page: header (title + subtitle + New job), then the
// tabbed table (tab pills + search + 6-column table) — same shape as
// homeowner-jobs-table.tsx — to avoid layout shift.
export default function HomeownerJobsLoading() {
  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 lg:gap-[1.111vw]">
        <div className="space-y-2 lg:space-y-[0.556vw]">
          <Skeleton className="h-8 lg:h-[2.222vw] w-28 lg:w-[8vw]" />
          <Skeleton className="h-4 lg:h-[1.111vw] w-72 lg:w-[24vw]" />
        </div>
        <Skeleton className="h-9 lg:h-[2.5vw] w-28 lg:w-[8vw] rounded-md lg:rounded-[0.556vw]" />
      </div>

      <div className="space-y-4 lg:space-y-[1.111vw]">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 lg:gap-[0.417vw]">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 lg:h-[2.222vw] w-20 lg:w-[5.5vw] rounded-md lg:rounded-[0.417vw]" />
          ))}
        </div>

        {/* Search */}
        <Skeleton className="h-9 lg:h-[2.5vw] w-full sm:max-w-xs lg:sm:max-w-[20vw] rounded-md lg:rounded-[0.556vw]" />

        {/* Table */}
        <div className="overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border">
          <div className="border-b border-border px-5 lg:px-[1.528vw] py-2.5 lg:py-[0.694vw]">
            <Skeleton className="h-3.5 lg:h-[0.972vw] w-full max-w-md lg:max-w-[26vw]" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 lg:gap-[0.833vw] border-b border-border px-5 lg:px-[1.528vw] py-3.5 lg:py-[0.972vw] last:border-0">
              <Skeleton className="h-4 lg:h-[1.111vw] w-32 lg:w-[9vw]" />
              <Skeleton className="h-4 lg:h-[1.111vw] w-28 lg:w-[7vw]" />
              <Skeleton className="h-5 lg:h-[1.389vw] w-16 lg:w-[4.5vw] rounded-full" />
              <Skeleton className="h-4 lg:h-[1.111vw] w-16 lg:w-[4.5vw]" />
              <Skeleton className="ml-auto h-7 lg:h-[1.944vw] w-14 lg:w-[4vw] rounded-md lg:rounded-[0.417vw]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
