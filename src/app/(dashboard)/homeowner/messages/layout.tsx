import { Suspense } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { listConversationSummaries } from "@/lib/actions/messages"
import { getHomeownerForUser, getHomeownerLeads } from "@/lib/data/homeowner"
import { MessagesShell } from "@/components/messaging/messages-shell"
import { MessagesLoading } from "@/components/messaging/messages-loading"
import { ConversationRail } from "@/components/messaging/conversation-rail"
import { ThreadView, type InboxEmptyKind } from "@/components/messaging/thread-view"

const BASE_PATH = "/homeowner/messages"

// The layout itself renders synchronously so it never suspends at the PARENT
// loading boundary (the dashboard's generic card skeleton). All the async work
// lives in <MessagesInbox/> under a local Suspense whose fallback is the real
// messaging skeleton — so a cold visit shows the messaging chrome, not cards.
export default function HomeownerMessagesLayout({
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
    getRequiredUser("homeowner"),
    listConversationSummaries(),
  ])

  // Why is the inbox empty? Drives the right pane's personalized empty state.
  // Only dig into jobs when there are no conversations at all.
  let emptyInbox: InboxEmptyKind | null = null
  if (conversations.length === 0) {
    const ho = await getHomeownerForUser(user.id)
    const leads = ho ? await getHomeownerLeads(ho.id) : []
    emptyInbox = leads.length > 0 ? "homeowner-waiting" : "homeowner-no-job"
  }

  return (
    <MessagesShell
      basePath={BASE_PATH}
      rail={<ConversationRail basePath={BASE_PATH} userId={user.id} initialItems={conversations} />}
      thread={<ThreadView basePath={BASE_PATH} userId={user.id} emptyInbox={emptyInbox} />}
    />
  )
}
