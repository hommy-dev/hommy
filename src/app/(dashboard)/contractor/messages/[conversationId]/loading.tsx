import { ThreadPaneSkeleton } from "@/components/messaging/messaging-skeletons"

// Fills the thread pane (the rail stays mounted from the layout) while the
// conversation detail + messages load — including when switching conversations.
export default function ThreadLoading() {
  return <ThreadPaneSkeleton />
}
