import Link from 'next/link'
import type { ConversationSummary } from '@/lib/data/conversations'
import { formatDistanceToNow } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ParticipantAvatar } from './participant-avatar'

/**
 * The messages sidebar/index — one row per conversation. Pure presentational;
 * the role layout's realtime hook re-renders the server page on `message:new`,
 * so this list stays current without its own subscription.
 */
export function ConversationList({
  conversations,
  basePath,
}: {
  conversations: ConversationSummary[]
  basePath: string
}) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-md lg:rounded-[0.556vw] border border-dashed border-border p-10 lg:p-[2.778vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
        No conversations yet. They’ll appear here once you connect with{' '}
        {basePath.includes('homeowner') ? 'a contractor' : 'a homeowner'}.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`${basePath}/${c.id}`}
            className="flex items-center gap-3 lg:gap-[0.833vw] px-4 lg:px-[1.111vw] py-3 lg:py-[0.833vw] transition-colors hover:bg-muted/40"
          >
            <ParticipantAvatar name={c.otherName} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 lg:gap-[0.556vw]">
                <p
                  className={cn(
                    'truncate text-sm lg:text-[0.972vw]',
                    c.hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground',
                  )}
                >
                  {c.otherName}
                </p>
                {c.lastMessageAt ? (
                  <span className="shrink-0 text-xs lg:text-[0.764vw] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.lastMessageAt))}
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  'truncate text-xs lg:text-[0.833vw]',
                  c.hasUnread ? 'text-foreground/80' : 'text-muted-foreground',
                )}
              >
                {c.lastMessageBody ?? 'No messages yet'}
              </p>
            </div>
            {c.hasUnread ? (
              <span aria-label="Unread" className="size-2 lg:size-[0.556vw] shrink-0 rounded-full bg-primary" />
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}
