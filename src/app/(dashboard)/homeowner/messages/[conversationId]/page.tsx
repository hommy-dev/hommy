import { notFound } from "next/navigation"
import { getRequiredUser } from "@/lib/auth/session"
import { getConversationForUser, listMessages } from "@/lib/data/conversations"
import { getJobPanelForConversation } from "@/lib/data/jobs"
import { ConversationThreadView } from "@/components/messaging/conversation-thread-view"
import { JobControlPanel } from "@/components/messaging/job-control-panel"

export default async function HomeownerThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  const user = await getRequiredUser("homeowner")

  const detail = await getConversationForUser(conversationId, user.id)
  if (!detail) notFound()

  const [{ messages }, panel] = await Promise.all([
    listMessages(conversationId, detail.me, { limit: 40 }),
    getJobPanelForConversation(conversationId, user.id),
  ])

  return (
    <ConversationThreadView
      detail={detail}
      initialMessages={messages}
      basePath="/homeowner/messages"
      panel={panel ? <JobControlPanel panel={panel} /> : null}
    />
  )
}
