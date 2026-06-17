import { Suspense } from "react"
import { getRequiredUser } from "@/lib/auth/session"
import { MessagesShell } from "@/components/messaging/messages-shell"
import { ConversationRailLoader } from "@/components/messaging/conversation-rail-loader"
import { ConversationRailSkeleton } from "@/components/messaging/messaging-skeletons"

const BASE_PATH = "/homeowner/messages"

export default async function HomeownerMessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getRequiredUser("homeowner")

  return (
    <MessagesShell
      basePath={BASE_PATH}
      rail={
        <Suspense fallback={<ConversationRailSkeleton />}>
          <ConversationRailLoader userId={user.id} basePath={BASE_PATH} />
        </Suspense>
      }
    >
      {children}
    </MessagesShell>
  )
}
