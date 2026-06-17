import { ThreadPaneSkeleton } from "@/components/messaging/messaging-skeletons"

// Fallback for the messages content pane while the page loads. The rail comes
// from the (already-rendered) layout, so this fills the thread pane only.
export default function MessagesLoading() {
  return <ThreadPaneSkeleton />
}
