import { MessageSquare } from 'lucide-react'

export function ChatEmptyPane() {
  return (
    <div className="hidden min-h-0 flex-1 flex-col items-center justify-center gap-3 lg:gap-[0.833vw] bg-muted/30 p-8 lg:p-[2.222vw] text-center md:flex">
      <div className="flex size-14 lg:size-[3.889vw] items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageSquare className="size-6 lg:size-[1.667vw]" />
      </div>
      <h2 className="text-base lg:text-[1.111vw] font-semibold text-foreground">
        Select a conversation
      </h2>
      <p className="max-w-sm lg:max-w-[26.664vw] text-sm lg:text-[0.972vw] text-muted-foreground">
        Pick a thread from the left to view the full conversation.
      </p>
    </div>
  )
}
