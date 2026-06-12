import { Skeleton } from "@/components/ui/skeleton"

// Generic dashboard content-area skeleton, shown while a page's data streams
// in (the sidebar/shell stays put). Used by the section-level loading.tsx files.
export function PageSkeleton() {
  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <div className="space-y-2 lg:space-y-[0.556vw]">
        <Skeleton className="h-8 lg:h-[2.222vw] w-48 lg:w-[16vw]" />
        <Skeleton className="h-4 lg:h-[1.111vw] w-72 lg:w-[24vw]" />
      </div>
      <div className="grid gap-3 lg:gap-[0.833vw] sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-32 lg:h-[10vw] rounded-lg lg:rounded-[0.694vw]"
          />
        ))}
      </div>
    </div>
  )
}
