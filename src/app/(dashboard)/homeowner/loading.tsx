import { Skeleton } from "@/components/ui/skeleton"

// Mirrors the homeowner Jobs page: header (title + subtitle + Post a job), then
// the search + status filter, then a grid of cards — same shape as
// homeowner-requests.tsx — to avoid layout shift.
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
        {/* Search + filter */}
        <div className="flex items-center gap-2 lg:gap-[0.556vw]">
          <Skeleton className="h-9 lg:h-[2.5vw] w-full sm:max-w-xs lg:max-w-[20vw] rounded-md lg:rounded-[0.556vw]" />
          <Skeleton className="h-9 lg:h-[2.5vw] w-28 lg:w-[8vw] rounded-md lg:rounded-[0.556vw]" />
        </div>

        {/* Card grid */}
        <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 lg:gap-[0.833vw] rounded-md lg:rounded-[0.7vw] border border-border bg-card p-5 lg:p-[1.389vw]"
            >
              <div className="flex items-center gap-2.5 lg:gap-[0.694vw]">
                <Skeleton className="size-9 lg:size-[2.5vw] rounded-full" />
                <Skeleton className="h-3.5 lg:h-[0.972vw] w-20 lg:w-[5.5vw]" />
              </div>
              <Skeleton className="h-5 lg:h-[1.389vw] w-2/3" />
              <Skeleton className="h-10 lg:h-[2.778vw] w-full rounded-md lg:rounded-[0.5vw]" />
              <Skeleton className="h-4 lg:h-[1.111vw] w-1/2" />
              <Skeleton className="mt-2 lg:mt-[0.556vw] h-9 lg:h-[2.5vw] w-full rounded-lg lg:rounded-[0.556vw]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
