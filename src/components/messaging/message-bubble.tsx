import { cn } from '@/lib/utils'
import type { ThreadMessage, ParticipantIdentity } from '@/lib/data/conversations'
import { QuoteCard } from './quote-card'
import { ParticipantAvatar } from './participant-avatar'

export type DisplayMessage = ThreadMessage & { pending?: boolean; failed?: boolean }

function timeLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/**
 * One message row. System messages render as a centered note; user/contractor
 * messages render as left/right bubbles (the other party gets an avatar). Flat,
 * lightly-rounded, no shadow.
 */
export function MessageBubble({
  message,
  viewerType,
  otherName,
}: {
  message: DisplayMessage
  viewerType?: ParticipantIdentity['type']
  otherName?: string
}) {
  // Rich quote payload → card the homeowner (a 'user' participant) can accept.
  if (message.meta?.kind === 'quote') {
    return <QuoteCard meta={message.meta} canAccept={viewerType === 'user'} />
  }

  if (message.senderType === 'system') {
    return (
      <div className="flex justify-center py-1 lg:py-[0.278vw]">
        <span className="rounded-md lg:rounded-[0.556vw] bg-muted px-3 lg:px-[0.833vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.764vw] text-muted-foreground">
          {message.body}
        </span>
      </div>
    )
  }

  const mine = message.isMine
  return (
    <div className={cn('flex items-end gap-2 lg:gap-[0.556vw]', mine ? 'justify-end' : 'justify-start')}>
      {!mine ? (
        <ParticipantAvatar name={otherName ?? '?'} className="size-7 lg:size-[2vw] self-end" />
      ) : null}
      <div
        className={cn(
          'max-w-[78%] rounded-lg lg:rounded-[0.694vw] px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] leading-relaxed',
          mine
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-card text-foreground',
          message.failed && 'opacity-60 ring-1 ring-destructive',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <span
          className={cn(
            'mt-1 lg:mt-[0.278vw] block text-right text-[10px] lg:text-[0.694vw]',
            mine ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          {message.failed ? 'Failed to send' : message.pending ? 'Sending…' : timeLabel(message.createdAt)}
        </span>
      </div>
    </div>
  )
}

/** Centered day divider between message groups. */
export function DayDivider({ iso }: { iso: string }) {
  return (
    <div className="flex justify-center py-2 lg:py-[0.556vw]">
      <span className="rounded-full bg-muted px-3 lg:px-[0.833vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] font-medium text-muted-foreground">
        {dayLabel(iso)}
      </span>
    </div>
  )
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
