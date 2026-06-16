import { getRequiredUser } from "@/lib/auth/session"
import { listConversationsForUser } from "@/lib/data/conversations"
import { MessagesShell } from "@/components/messaging/messages-shell"

export default async function ContractorMessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getRequiredUser("contractor")
  const conversations = await listConversationsForUser(user.id)

  return (
    <MessagesShell conversations={conversations} basePath="/contractor/messages">
      {children}
    </MessagesShell>
  )
}
