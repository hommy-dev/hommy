import { MessageSquare } from "lucide-react"

// The conversation rail lives in this route's layout; this index just fills the
// right pane with a prompt (visible on desktop — mobile shows the rail instead).
export default function ContractorMessagesIndex() {
  return (
    <div className="grid flex-1 place-items-center p-10 lg:p-[2.778vw] text-center">
      <div className="space-y-2 lg:space-y-[0.556vw]">
        <MessageSquare
          className="mx-auto size-8 lg:size-[2.222vw] text-muted-foreground/60"
          strokeWidth={1.5}
        />
        <p className="font-medium lg:text-[1.042vw]">Select a conversation</p>
        <p className="text-sm lg:text-[0.903vw] text-muted-foreground">
          Pick a chat from the left to start messaging.
        </p>
      </div>
    </div>
  )
}
