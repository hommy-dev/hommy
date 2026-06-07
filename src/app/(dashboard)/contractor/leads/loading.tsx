import { Skeleton } from "@/components/ui/skeleton"

export default function LeadsLoading() {
  return (
    <div className="mx-auto max-w-5xl lg:max-w-[71.104vw] space-y-6 lg:space-y-[1.667vw]">
      <Skeleton className="h-8 lg:h-[2.222vw] w-40 lg:w-[11.111vw]" />
      <div className="flex flex-wrap gap-2 lg:gap-[0.556vw]">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 lg:h-[2.222vw] w-20 lg:w-[5.556vw] rounded-full" />
        ))}
      </div>
      <div className="grid gap-3 lg:gap-[0.833vw] sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 lg:h-[7.778vw] rounded-lg lg:rounded-[0.694vw]" />
        ))}
      </div>
    </div>
  )
}
