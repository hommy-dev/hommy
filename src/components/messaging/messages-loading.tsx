import { MessageSquare } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Full-bleed loading state for the messaging surface. Mirrors MessagesShell:
 * a conversation rail on the left (chrome + row skeletons, matching
 * ConversationRail) and the empty thread placeholder on the right — so there's
 * no layout shift when the live inbox paints in.
 */
export function MessagesLoading() {
  return (
    <div className="flex h-full overflow-hidden bg-background">
      <aside className="flex w-full shrink-0 flex-col border-r border-border lg:w-[20vw] xl:w-[19vw]">
        {/* Title */}
        <div className="px-4 pb-2 pt-4 lg:px-[1.111vw] lg:pb-[0.556vw] lg:pt-[1.111vw]">
          <h1 className="text-base lg:text-[1.25vw] font-semibold tracking-tight">Messages</h1>
        </div>
        {/* Search */}
        <div className="px-3 pb-2 lg:px-[0.556vw] lg:pb-[0.556vw]">
          <Skeleton className="h-9 lg:h-[2.5vw] w-full rounded lg:rounded-[0.4vw]" />
        </div>
        {/* Conversation rows */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 lg:px-[0.556vw]">
          <div className="space-y-0.5 lg:space-y-[0.139vw]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 lg:gap-[0.833vw] px-2.5 py-2.5 lg:px-[0.694vw] lg:py-[0.694vw]"
              >
                <Skeleton className="size-10 lg:size-[2.778vw] shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2 lg:space-y-[0.556vw]">
                  <Skeleton className="h-3.5 lg:h-[0.972vw] w-32 lg:w-[8vw]" />
                  <Skeleton className="h-3 lg:h-[0.833vw] w-44 lg:w-[13vw]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Thread placeholder (desktop only, matching ThreadView's empty state) */}
      <div className="hidden min-w-0 flex-1 place-items-center p-10 lg:flex lg:p-[2.778vw] text-center">
        <div className="m-auto space-y-2 lg:space-y-[0.556vw]">
          <MessageSquare
            className="mx-auto size-8 lg:size-[2.222vw] text-muted-foreground/40"
            strokeWidth={1.5}
          />
          <p className="font-medium text-muted-foreground lg:text-[1.042vw]">Loading messages…</p>
        </div>
      </div>
    </div>
  )
}
