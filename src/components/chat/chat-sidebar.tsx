'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  useConversations,
  type StoredConversation,
} from './chat-store'
import { AvatarOnlineDot } from '@/components/presence/online-indicator'

type Props = {
  viewer: 'homeowner' | 'contractor'
  basePath: string // e.g. "/homeowner/messages"
}

/**
 * Left-pane conversation list. Fully store-driven — the server layout
 * mounts <ChatStoreHydrator> at the root so this component receives live
 * updates from the per-user inbox broadcast channel without any server
 * round-trip.
 *
 * Ordering, unread counts, and last-message previews are all reactive.
 */
export function ChatSidebar({ viewer, basePath }: Props) {
  const conversations = useConversations()
  const [query, setQuery] = useState('')
  const pathname = usePathname()
  const activeId = pathname.startsWith(`${basePath}/`)
    ? pathname.slice(`${basePath}/`.length)
    : null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => {
      const other =
        viewer === 'homeowner' ? c.contractorBusinessName : c.homeownerFullName
      return (
        (other ?? '').toLowerCase().includes(q) ||
        (c.projectTitle ?? '').toLowerCase().includes(q) ||
        (c.lastMessagePreview ?? '').toLowerCase().includes(q)
      )
    })
  }, [conversations, query, viewer])

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-r border-border bg-background md:w-80">
      <header className="border-b border-border px-4 py-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Messages
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {viewer === 'homeowner'
            ? 'Pre-hire questions and active jobs.'
            : 'Pre-hire chats on your quotes and active jobs.'}
        </p>
      </header>

      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="h-9 pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 py-12 text-center text-xs text-muted-foreground">
            {query
              ? 'No conversations match that search.'
              : viewer === 'homeowner'
                ? 'No conversations yet. When contractors quote your project, you can ask them questions here.'
                : 'No conversations yet. Submit a quote on a lead — the homeowner can reach out here.'}
          </div>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((c) => (
              <SidebarRow
                key={c.id}
                c={c}
                viewer={viewer}
                href={`${basePath}/${c.id}`}
                active={c.id === activeId}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

function SidebarRow({
  c,
  viewer,
  href,
  active,
}: {
  c: StoredConversation
  viewer: 'homeowner' | 'contractor'
  href: string
  active: boolean
}) {
  const otherName =
    viewer === 'homeowner' ? c.contractorBusinessName : c.homeownerFullName
  const otherAvatar =
    viewer === 'homeowner' ? c.contractorAvatarUrl : c.homeownerAvatarUrl
  const otherUserId =
    viewer === 'homeowner' ? c.contractorUserId : c.homeownerUserId
  const initials = getInitials(otherName)
  const hasUnread = c.unreadCount > 0

  return (
    <li>
      <Link
        href={href}
        className={cn(
          'flex items-start gap-3 border-b border-border/60 px-3 py-3 transition-colors',
          active ? 'bg-muted/80' : 'hover:bg-muted/50',
        )}
      >
        <div className="relative shrink-0">
          <Avatar size="default" className="size-10">
            {otherAvatar ? <AvatarImage src={otherAvatar} alt="" /> : null}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <AvatarOnlineDot userId={otherUserId} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={cn(
                'truncate text-sm',
                hasUnread
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-foreground',
              )}
            >
              {otherName || 'Conversation'}
            </p>
            {c.lastMessageAt ? (
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatShortTime(c.lastMessageAt)}
              </span>
            ) : null}
          </div>

          <p
            className={cn(
              'mt-0.5 truncate text-xs',
              hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {c.lastMessagePreview ?? 'No messages yet'}
          </p>

          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {statusLabel(c)}
          </p>
        </div>

        {hasUnread ? (
          <span className="mt-1 inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
            {c.unreadCount > 99 ? '99+' : c.unreadCount}
          </span>
        ) : null}
      </Link>
    </li>
  )
}

function statusLabel(c: StoredConversation): string {
  if (c.jobId) {
    if (c.jobStatus === 'COMPLETED') return `Completed job · ${c.projectTitle}`
    if (c.jobStatus === 'IN_PROGRESS') return `In progress · ${c.projectTitle}`
    if (c.jobStatus === 'COMPLETE_PENDING')
      return `Awaiting release · ${c.projectTitle}`
    return `Active job · ${c.projectTitle}`
  }
  if (c.quoteStatus === 'PENDING') return `Pending quote · ${c.projectTitle}`
  if (c.quoteStatus === 'ACCEPTED') return `Accepted · ${c.projectTitle}`
  if (c.quoteStatus)
    return `Quote ${c.quoteStatus.toLowerCase()} · ${c.projectTitle}`
  return c.projectTitle
}

function getInitials(name: string): string {
  const t = (name ?? '').trim()
  if (!t) return '?'
  const parts = t.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatShortTime(iso: string): string {
  const date = new Date(iso)
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
