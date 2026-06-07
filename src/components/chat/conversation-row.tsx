import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { ConversationRow as ConversationData } from '@/lib/data/chat'

type Props = {
  conversation: ConversationData
  /** Viewer role — determines which side's name we emphasize. */
  viewer: 'homeowner' | 'contractor'
  href: string
}

/**
 * List item for `/homeowner/messages` and `/contractor/messages`.
 * Shows the other party's identity, a preview of the last message, and
 * an unread indicator.
 */
export function ConversationListRow({
  conversation: c,
  viewer,
  href,
}: Props) {
  const otherName =
    viewer === 'homeowner' ? c.contractorBusinessName : c.homeownerFullName
  const otherAvatar =
    viewer === 'homeowner' ? c.contractorAvatarUrl : c.homeownerAvatarUrl
  const initials = getInitials(otherName)
  const hasUnread = c.unreadCountForMe > 0
  const subtitle = c.jobId
    ? `Active job — ${c.projectTitle}`
    : c.quoteStatus === 'PENDING'
      ? `Quote pending — ${c.projectTitle}`
      : c.quoteStatus
        ? `Quote ${c.quoteStatus.toLowerCase()} — ${c.projectTitle}`
        : c.projectTitle

  return (
    <Link
      href={href}
      className={cn(
        'flex items-start gap-3 lg:gap-[0.833vw] rounded-xl lg:rounded-[0.926vw] border border-border bg-card p-3 lg:p-[0.833vw] transition-colors hover:border-primary/40',
        hasUnread && 'ring-1 ring-primary/30',
      )}
    >
      <Avatar size="default" className="size-10 lg:size-[2.778vw] shrink-0">
        {otherAvatar ? <AvatarImage src={otherAvatar} alt="" /> : null}
        <AvatarFallback className="text-xs lg:text-[0.833vw]">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 lg:gap-[0.556vw]">
          <p className="truncate text-sm lg:text-[0.972vw] font-medium text-foreground">
            {otherName || 'Conversation'}
          </p>
          {c.lastMessageAt ? (
            <span className="shrink-0 text-[11px] lg:text-[0.764vw] text-muted-foreground">
              {formatShortTime(c.lastMessageAt)}
            </span>
          ) : null}
        </div>

        <p className="truncate text-xs lg:text-[0.833vw] text-muted-foreground">{subtitle}</p>

        <p
          className={cn(
            'mt-0.5 lg:mt-[0.139vw] truncate text-xs lg:text-[0.833vw]',
            hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground',
          )}
        >
          {c.lastMessagePreview ?? 'No messages yet'}
        </p>
      </div>

      {hasUnread ? (
        <span className="mt-1.5 lg:mt-[0.417vw] inline-flex size-2 lg:size-[0.556vw] shrink-0 rounded-full bg-primary" />
      ) : null}
    </Link>
  )
}

function getInitials(name: string): string {
  const t = (name ?? '').trim()
  if (!t) return '?'
  const parts = t.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatShortTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
