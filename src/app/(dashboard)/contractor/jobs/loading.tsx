import { Skeleton } from "@/components/ui/skeleton"

export default function JobsLoading() {
  return (
    <div className="mx-auto w-full space-y-6 lg:space-y-[1.667vw]">
      <Skeleton className="h-8 lg:h-[2.222vw] w-40 lg:w-[11vw]" />
      <Skeleton className="h-9 lg:h-[2.5vw] w-full max-w-xs lg:max-w-[20vw]" />
      <div className="grid gap-4 lg:gap-[1.111vw] sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, col) => (
          <div key={col} className="space-y-3 lg:space-y-[0.833vw]">
            <Skeleton className="h-6 lg:h-[1.667vw] w-24 lg:w-[6vw] rounded-full" />
            <Skeleton className="h-32 lg:h-[9vw] rounded-lg lg:rounded-[0.694vw]" />
            <Skeleton className="h-32 lg:h-[9vw] rounded-lg lg:rounded-[0.694vw]" />
          </div>
        ))}
      </div>
    </div>
  )
}
