import { notFound } from "next/navigation"
import { getRequiredUser } from "@/lib/auth/session"
import { getConversationForUser, listMessages } from "@/lib/data/conversations"
import { ConversationThreadView } from "@/components/messaging/conversation-thread-view"

export default async function HomeownerThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  const user = await getRequiredUser("homeowner")

  const detail = await getConversationForUser(conversationId, user.id)
  if (!detail) notFound()

  const { messages } = await listMessages(conversationId, detail.me, { limit: 40 })

  return (
    <ConversationThreadView
      detail={detail}
      initialMessages={messages}
      basePath="/homeowner/messages"
    />
  )
}
