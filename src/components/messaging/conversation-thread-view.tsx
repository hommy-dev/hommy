import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ConversationDetail } from '@/lib/data/conversations'
import type { DisplayMessage } from './message-bubble'
import { ParticipantAvatar } from './participant-avatar'
import { MessageThread } from './message-thread'

/**
 * Full-height conversation surface: a back link + header over the live thread.
 * Self-contained scroll (bounded height) so the composer stays pinned.
 */
export function ConversationThreadView({
  detail,
  initialMessages,
  basePath,
}: {
  detail: ConversationDetail
  initialMessages: DisplayMessage[]
  basePath: string
}) {
  return (
    <div className="flex h-[calc(100dvh-9.5rem)] lg:h-[calc(100dvh-9vw)] flex-col overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border bg-background">
      <header className="flex items-center gap-3 lg:gap-[0.833vw] border-b border-border px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw]">
        <Link
          href={basePath}
          aria-label="Back to messages"
          className="grid size-8 lg:size-[2.222vw] shrink-0 place-items-center rounded-md lg:rounded-[0.556vw] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4 lg:size-[1.111vw]" strokeWidth={2} />
        </Link>
        <ParticipantAvatar name={detail.otherName} />
        <div className="min-w-0">
          <p className="truncate text-sm lg:text-[0.972vw] font-semibold">{detail.otherName}</p>
          <p className="text-xs lg:text-[0.764vw] text-muted-foreground">
            {detail.otherKind === 'contractor' ? 'Contractor' : 'Homeowner'}
          </p>
        </div>
      </header>
      <MessageThread conversationId={detail.id} me={detail.me} initialMessages={initialMessages} />
    </div>
  )
}
