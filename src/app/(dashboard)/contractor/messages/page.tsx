import { getRequiredUser } from "@/lib/auth/session"
import { listConversationsForUser } from "@/lib/data/conversations"
import { ConversationList } from "@/components/messaging/conversation-list"

export default async function ContractorMessagesPage() {
  const user = await getRequiredUser("contractor")
  const conversations = await listConversationsForUser(user.id)

  return (
    <div className="space-y-6 lg:space-y-[1.667vw]">
      <header className="w-full">
        <h1 className="font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">
          Messages
        </h1>
        <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          Your conversations with homeowners on engaged leads.
        </p>
      </header>

      <ConversationList conversations={conversations} basePath="/contractor/messages" />
    </div>
  )
}
