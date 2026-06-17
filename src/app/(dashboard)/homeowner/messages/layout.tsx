import { getRequiredUser } from "@/lib/auth/session"
import { MessagesShell } from "@/components/messaging/messages-shell"
import { ConversationRail } from "@/components/messaging/conversation-rail"
import { ThreadView } from "@/components/messaging/thread-view"

const BASE_PATH = "/homeowner/messages"

export default async function HomeownerMessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getRequiredUser("homeowner")

  return (
    <>
      <MessagesShell
        basePath={BASE_PATH}
        rail={<ConversationRail basePath={BASE_PATH} userId={user.id} />}
        thread={<ThreadView basePath={BASE_PATH} userId={user.id} />}
      />
      {/* Route pages are inert; the persistent ThreadView renders the active thread. */}
      <span className="hidden">{children}</span>
    </>
  )
}
