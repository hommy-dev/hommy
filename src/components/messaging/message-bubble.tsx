import { cn } from '@/lib/utils'
import type { ThreadMessage, ParticipantIdentity } from '@/lib/data/conversations'
import type { MessageMeta } from '@/lib/db/schema'
import { Icon } from '@/components/ui/icon'
import { QuoteCard } from './quote-card'
import { ReviewCard } from './review-card'
import { AttachmentList } from './attachment-list'
import { ParticipantAvatar } from './participant-avatar'

export type ReviewState = { submitted: boolean; rating: number | null; canReview: boolean }

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
        ? 'You accepted this quote. You’re hired! 🎉'
        : `${otherName} accepted your quote. You won the job! 🎉`
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
  otherAvatarUrl,
  reviewState,
}: {
  message: DisplayMessage
  viewerType?: ParticipantIdentity['type']
  otherName?: string
  otherAvatarUrl?: string | null
  reviewState?: ReviewState
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

  // Inline review prompt (posted at completion) — homeowner rates in-thread.
  if (message.meta?.kind === 'review') {
    return <ReviewCard meta={message.meta} viewerType={viewerType} reviewState={reviewState} />
  }

  // Lifecycle auto-message → personalized bubble owned by the triggering party.
  if (message.meta?.kind === 'event') {
    const mine = viewerType ? message.meta.actorType === viewerType : false
    const text = eventText(message.meta, { mine, otherName: otherName ?? 'They' })
    return (
      <div className={cn('flex items-end gap-2 lg:gap-[0.556vw]', mine ? 'justify-end' : 'justify-start')}>
        {!mine ? (
          <ParticipantAvatar name={otherName ?? '?'} src={otherAvatarUrl} className="size-7 lg:size-[2vw] self-end" />
        ) : null}
        <div
          className={cn(
            'max-w-[80%] lg:max-w-[60%] rounded-lg lg:rounded-[0.694vw] px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[1vw] leading-relaxed',
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

  // File attachments → standard left/right bubble with thumbnails / download
  // chips, plus the optional caption (the message body).
  if (message.meta?.kind === 'attachment') {
    const mine = message.isMine
    const caption = message.body.trim()
    return (
      <div className={cn('flex items-end gap-2 lg:gap-[0.556vw]', mine ? 'justify-end' : 'justify-start')}>
        {!mine ? (
          <ParticipantAvatar name={otherName ?? '?'} src={otherAvatarUrl} className="size-7 lg:size-[2vw] self-end" />
        ) : null}
        <div
          className={cn(
            'max-w-[80%] lg:max-w-[60%] rounded-lg lg:rounded-[0.694vw] p-1.5 lg:p-[0.417vw]',
            mine ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground',
            message.failed && 'opacity-60 ring-1 ring-destructive',
          )}
        >
          <AttachmentList files={message.meta.files} mine={mine} />
          {caption ? (
            <p className="px-1.5 lg:px-[0.417vw] pt-1.5 lg:pt-[0.417vw] text-sm lg:text-[1vw] leading-relaxed whitespace-pre-wrap break-words">
              {caption}
            </p>
          ) : null}
          <span
            suppressHydrationWarning
            className={cn(
              'mt-1 lg:mt-[0.278vw] block px-1.5 lg:px-[0.417vw] text-right text-[10px] lg:text-[0.694vw]',
              mine ? 'text-primary-foreground/70' : 'text-muted-foreground',
            )}
          >
            {message.failed ? 'Failed to send · tap to retry' : timeLabel(message.createdAt)}
          </span>
        </div>
      </div>
    )
  }

  // Feature suggestion → a styled idea card on the sender's side.
  if (message.meta?.kind === 'feature_request') {
    const mine = message.isMine
    const { subject, details } = message.meta
    return (
      <div className={cn('flex items-end gap-2 lg:gap-[0.556vw]', mine ? 'justify-end' : 'justify-start')}>
        {!mine ? (
          <ParticipantAvatar name={otherName ?? '?'} src={otherAvatarUrl} className="size-7 lg:size-[2vw] self-end" />
        ) : null}
        <div
          className={cn(
            'max-w-[85%] lg:max-w-[62%] rounded-lg lg:rounded-[0.694vw] border p-3 lg:p-[0.833vw]',
            mine ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
          )}
        >
          <div className="flex items-center gap-1.5 lg:gap-[0.417vw] text-[11px] lg:text-[0.764vw] font-semibold uppercase tracking-wide text-primary">
            <Icon name="lightbulb" className="size-3.5 lg:size-[0.972vw]" />
            Feature idea
          </div>
          <p className="mt-1.5 lg:mt-[0.417vw] text-sm lg:text-[0.972vw] font-semibold text-foreground">
            {subject}
          </p>
          <p className="mt-1 lg:mt-[0.278vw] whitespace-pre-wrap break-words text-sm lg:text-[0.903vw] text-muted-foreground">
            {details}
          </p>
          <span
            suppressHydrationWarning
            className="mt-1.5 lg:mt-[0.417vw] block text-right text-[10px] lg:text-[0.694vw] text-muted-foreground"
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
        <ParticipantAvatar name={otherName ?? '?'} src={otherAvatarUrl} className="size-7 lg:size-[2vw] self-end" />
      ) : null}
      <div
        className={cn(
          'max-w-[78%] lg:max-w-[55%] rounded-lg lg:rounded-[0.694vw] px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[1vw] leading-relaxed',
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
