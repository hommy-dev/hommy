import { cn } from '@/lib/utils'
import type { ThreadMessage, ParticipantIdentity } from '@/lib/data/conversations'
import type { MessageMeta } from '@/lib/db/schema'
import { QuoteCard } from './quote-card'
import { ParticipantAvatar } from './participant-avatar'

export type DisplayMessage = ThreadMessage & { pending?: boolean; failed?: boolean }

function timeLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/**
 * Personalized copy for a lifecycle auto-message. `mine` = the viewer triggered
 * it. So a homeowner who accepted reads "You accepted…", while the contractor
 * reads "<Company> accepted your quote". Same event, two viewpoints.
 */
function eventText(
  meta: Extract<MessageMeta, { kind: 'event' }>,
  opts: { mine: boolean; otherName: string },
): string {
  const { mine, otherName } = opts
  switch (meta.event) {
    case 'quote_accepted':
      return mine
        ? 'You accepted this quote — you’re hired! 🎉'
        : `${otherName} accepted your quote — you won the job! 🎉`
    case 'job_completed':
      return mine ? 'You marked the job as completed.' : `${otherName} marked the job as completed.`
    case 'quote_superseded':
      return mine ? 'You sent an updated quote.' : `${otherName} sent an updated quote.`
    default:
      return ''
  }
}

/**
 * One message row. A quote payload renders a rich card (aligned to the sender's
 * side); a lifecycle `event` renders a personalized bubble on the triggering
 * party's side; plain messages render as left/right bubbles.
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
  // The quote is always contractor-sent, so it sits on the contractor's side.
  if (message.meta?.kind === 'quote') {
    return (
      <QuoteCard
        meta={message.meta}
        viewerType={viewerType}
        mine={viewerType === 'contractor'}
        otherName={otherName}
      />
    )
  }

  // Lifecycle auto-message → personalized bubble owned by the triggering party.
  if (message.meta?.kind === 'event') {
    const mine = viewerType ? message.meta.actorType === viewerType : false
    const text = eventText(message.meta, { mine, otherName: otherName ?? 'They' })
    return (
      <div className={cn('flex items-end gap-2 lg:gap-[0.556vw]', mine ? 'justify-end' : 'justify-start')}>
        {!mine ? (
          <ParticipantAvatar name={otherName ?? '?'} className="size-7 lg:size-[2vw] self-end" />
        ) : null}
        <div
          className={cn(
            'max-w-[78%] rounded-lg lg:rounded-[0.694vw] px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.903vw] leading-relaxed',
            mine
              ? 'bg-primary/90 text-primary-foreground'
              : 'border border-border bg-muted/60 text-foreground',
          )}
        >
          <p className="whitespace-pre-wrap break-words">{text}</p>
          <span
            suppressHydrationWarning
            className={cn(
              'mt-1 lg:mt-[0.278vw] block text-right text-[10px] lg:text-[0.694vw]',
              mine ? 'text-primary-foreground/70' : 'text-muted-foreground',
            )}
          >
            {timeLabel(message.createdAt)}
          </span>
        </div>
      </div>
    )
  }

  // Legacy plain system note (no structured meta) → centered notice.
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
          suppressHydrationWarning
          className={cn(
            'mt-1 lg:mt-[0.278vw] block text-right text-[10px] lg:text-[0.694vw]',
            mine ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          {/* Optimistic: no "sending" status — the bubble just appears, like any
              chat app. Only a hard failure is surfaced (with a retry hint). */}
          {message.failed ? 'Failed to send · tap to retry' : timeLabel(message.createdAt)}
        </span>
      </div>
    </div>
  )
}

/** Centered day divider between message groups. */
export function DayDivider({ iso }: { iso: string }) {
  return (
    <div className="flex justify-center py-2 lg:py-[0.556vw]">
      <span
        suppressHydrationWarning
        className="rounded-full bg-muted px-3 lg:px-[0.833vw] py-0.5 lg:py-[0.139vw] text-xs lg:text-[0.764vw] font-medium text-muted-foreground"
      >
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
