import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading placeholder for the thread pane. Shapes/spacing mirror
 * ConversationThreadView so the skeleton swaps cleanly into the real UI with no
 * layout shift. The conversation rail comes from the route layout, so this only
 * fills the right-hand pane.
 */
export function ThreadPaneSkeleton() {
  // Alternating inbound/outbound bubbles of varying width.
  const bubbles = [
    { mine: false, w: "w-40 lg:w-[14vw]" },
    { mine: true, w: "w-52 lg:w-[18vw]" },
    { mine: false, w: "w-32 lg:w-[10vw]" },
    { mine: false, w: "w-56 lg:w-[20vw]" },
    { mine: true, w: "w-44 lg:w-[15vw]" },
  ]
  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
      <header className="flex items-center gap-3 lg:gap-[0.833vw] border-b border-border px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]">
        <Skeleton className="size-9 lg:size-[2.5vw] shrink-0 rounded-full" />
        <div className="space-y-1.5 lg:space-y-[0.417vw]">
          <Skeleton className="h-4 lg:h-[1.111vw] w-32 lg:w-[8vw]" />
          <Skeleton className="h-3 lg:h-[0.833vw] w-20 lg:w-[5vw]" />
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-4 lg:space-y-[1.111vw] overflow-hidden p-4 lg:p-[1.111vw]">
        {bubbles.map((b, i) => (
          <div key={i} className={b.mine ? "flex justify-end" : "flex justify-start"}>
            <Skeleton
              className={`h-12 lg:h-[3.333vw] ${b.w} rounded-2xl lg:rounded-[1.111vw]`}
            />
          </div>
        ))}
      </div>
      <div className="border-t border-border p-4 lg:p-[1.111vw]">
        <Skeleton className="h-11 lg:h-[3vw] w-full rounded-md lg:rounded-[0.556vw]" />
      </div>
    </div>
  )
}

/**
 * Loading placeholder for the conversation rail (search header + a few rows).
 * Fills MessagesShell's <aside> while listConversationsForUser streams in.
 */
export function ConversationRailSkeleton() {
  return (
    <>
      <div className="space-y-3 lg:space-y-[0.833vw] border-b border-border p-4 lg:p-[1.111vw]">
        <Skeleton className="h-5 lg:h-[1.389vw] w-24 lg:w-[6vw]" />
        <Skeleton className="h-9 lg:h-[2.5vw] w-full rounded-md lg:rounded-[0.556vw]" />
      </div>
      <div className="min-h-0 flex-1 divide-y divide-border overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 lg:gap-[0.833vw] px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]"
          >
            <Skeleton className="size-9 lg:size-[2.5vw] shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5 lg:space-y-[0.417vw]">
              <Skeleton className="h-4 lg:h-[1.111vw] w-32 lg:w-[8vw]" />
              <Skeleton className="h-3 lg:h-[0.833vw] w-40 lg:w-[12vw]" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
