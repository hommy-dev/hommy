import { getRequiredUser } from "@/lib/auth/session"
import { listConversationsForUser } from "@/lib/data/conversations"
import { MessagesShell } from "@/components/messaging/messages-shell"

export default async function HomeownerMessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getRequiredUser("homeowner")
  const conversations = await listConversationsForUser(user.id)

  return (
    <MessagesShell conversations={conversations} basePath="/homeowner/messages">
      {children}
    </MessagesShell>
  )
}
