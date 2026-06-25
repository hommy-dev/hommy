import { Suspense } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { listConversationSummaries } from "@/lib/actions/messages"
import { MessagesShell } from "@/components/messaging/messages-shell"
import { MessagesLoading } from "@/components/messaging/messages-loading"
import { ConversationRail } from "@/components/messaging/conversation-rail"
import { ThreadView, type InboxEmptyKind } from "@/components/messaging/thread-view"

const BASE_PATH = "/contractor/messages"

// Synchronous layout so it never suspends at the parent (card) loading boundary;
// the async inbox load shows the real messaging skeleton via the local Suspense.
export default function ContractorMessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Suspense fallback={<MessagesLoading />}>
        <MessagesInbox />
      </Suspense>
      {/* Route pages are inert; the persistent ThreadView renders the active thread. */}
      <span className="hidden">{children}</span>
    </>
  )
}

async function MessagesInbox() {
  const [user, conversations] = await Promise.all([
    getRequiredUser("contractor"),
    listConversationSummaries(),
  ])

  // No real (non-support) chats yet → the right pane explains how chats start for
  // a pro. The pinned Hommy Support thread doesn't count as "you have chats".
  const realChats = conversations.filter((c) => c.contextType !== "support")
  const emptyInbox: InboxEmptyKind | null =
    realChats.length === 0 ? "contractor-no-chats" : null

  return (
    <MessagesShell
      basePath={BASE_PATH}
      rail={<ConversationRail basePath={BASE_PATH} userId={user.id} initialItems={conversations} />}
      thread={<ThreadView basePath={BASE_PATH} userId={user.id} emptyInbox={emptyInbox} />}
    />
  )
}
