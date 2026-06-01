import { MessageSquare } from 'lucide-react'

export function ChatEmptyPane() {
  return (
    <div className="hidden min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-muted/30 p-8 text-center md:flex">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageSquare className="size-6" />
      </div>
      <h2 className="text-base font-semibold text-foreground">
        Select a conversation
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Pick a thread from the left to view the full conversation.
      </p>
    </div>
  )
}
