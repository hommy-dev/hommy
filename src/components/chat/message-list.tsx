'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MessageBubble } from './message-bubble'
import { SystemMessageBubble } from './system-message-bubble'
import { DaySeparator } from './day-separator'
import type { ChatMessage } from './use-chat-messages'

export type MessageListSender = {
  userId: string
  name: string
  avatarUrl: string | null
}

type Props = {
  messages: ChatMessage[]
  currentUserId: string
  /** Display info for each user id that can appear in this thread. */
  senders: Record<string, MessageListSender>
  onDelete?: (messageId: string) => Promise<{ ok: boolean; message?: string } | void>
  onEdit?: (
    messageId: string,
    newContent: string,
  ) => Promise<{ ok: boolean; message?: string } | void>
  onReply?: (message: ChatMessage) => void
  onJumpToMessage?: (messageId: string) => void
  /** Tells the system bubble whether to show homeowner-side or contractor-side CTAs. */
  viewerRole?: 'HOMEOWNER' | 'CONTRACTOR'
  emptyState?: React.ReactNode
  className?: string
  /** Called when the scroll reaches the top. Parent should prepend older messages. */
  onLoadOlder?: () => Promise<void>
  hasMoreOlder?: boolean
  loadingOlder?: boolean
  /** When set, scroll that message into view and flash-highlight it.
   *  Parent should clear this back to null once the animation finishes
   *  (the list itself is stateless about timing — the parent owns the
   *  fade-out). */
  highlightedMessageId?: string | null
}

// Discord groups messages from the same sender within a 5-minute window.
const GROUP_WINDOW_MS = 5 * 60_000
const NEAR_BOTTOM_SLACK_PX = 80
const NEAR_TOP_SLACK_PX = 120

export function MessageList({
  messages,
  currentUserId,
  senders,
  onDelete,
  onEdit,
  onReply,
  onJumpToMessage,
  viewerRole = 'HOMEOWNER',
  emptyState,
  className,
  onLoadOlder,
  hasMoreOlder,
  loadingOlder,
  highlightedMessageId,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const wasAtBottomRef = useRef(true)
  const prevScrollHeightRef = useRef(0)
  // One-shot mount flag stored as a ref so it doesn't trigger renders
  // and stays compliant with react-hooks/set-state-in-effect.
  const initializedRef = useRef(false)

  const rows = useRenderRows(messages)

  // Live-message lookup for ParentQuote. O(1) by id. Rebuilt on each
  // messages change — that's the cheap path vs. indexing a ref.
  const liveMap = useMemo(() => {
    const m = new Map<string, ChatMessage>()
    for (const msg of messages) m.set(msg.id, msg)
    return m
  }, [messages])
  const getLiveMessage = useCallback(
    (id: string) => liveMap.get(id),
    [liveMap],
  )

  // Scroll the highlighted parent into view when the id changes. If the
  // target isn't in the DOM yet (e.g. pagination hasn't loaded it), fail
  // quietly — the user can scroll up manually.
  useEffect(() => {
    if (!highlightedMessageId) return
    const el = scrollRef.current
    if (!el) return
    const target = el.querySelector<HTMLDivElement>(
      `[data-message-id="${cssEscape(highlightedMessageId)}"]`,
    )
    if (!target) return
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlightedMessageId])

  // Initial mount: snap to bottom. Empty deps + ref guard means this
  // runs once and never re-renders the component.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || initializedRef.current) return
    el.scrollTop = el.scrollHeight
    initializedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally one-shot on mount
  }, [])

  // Track "near bottom" state on every scroll for the stick-to-bottom logic.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      wasAtBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_SLACK_PX
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Infinite-scroll upward.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !onLoadOlder) return
    const onScroll = () => {
      if (loadingOlder || !hasMoreOlder) return
      if (el.scrollTop < NEAR_TOP_SLACK_PX) {
        prevScrollHeightRef.current = el.scrollHeight
        void onLoadOlder()
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [onLoadOlder, hasMoreOlder, loadingOlder])

  // After an older-page prepend, preserve the viewer's anchor.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (prevScrollHeightRef.current > 0) {
      const diff = el.scrollHeight - prevScrollHeightRef.current
      if (diff > 0) el.scrollTop += diff
      prevScrollHeightRef.current = 0
    }
  }, [messages.length])

  // New incoming message at the bottom: stick if we were already there.
  useEffect(() => {
    if (!initializedRef.current) return
    if (wasAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
    }
  }, [messages.length])

  if (messages.length === 0 && emptyState) {
    return (
      <div
        className={cn(
          'flex flex-1 items-center justify-center p-8',
          className,
        )}
      >
        {emptyState}
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex-1 overflow-y-auto overscroll-contain px-4 py-3',
        className,
      )}
    >
      {onLoadOlder ? (
        <div className="flex h-8 items-center justify-center text-[11px] text-muted-foreground">
          {loadingOlder ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-3 animate-spin" />
              Loading older messages…
            </span>
          ) : !hasMoreOlder && messages.length > 0 ? (
            <span>Start of the conversation</span>
          ) : null}
        </div>
      ) : null}

      {rows.map((row) => {
        if (row.kind === 'day') {
          return <DaySeparator key={`day-${row.day}`} date={new Date(row.day)} />
        }
        if (row.message.kind === 'SYSTEM') {
          return (
            <SystemMessageBubble
              key={row.message.id}
              message={row.message}
              viewerRole={viewerRole}
            />
          )
        }
        return (
          <MessageBubble
            key={row.message.id}
            message={row.message}
            mine={row.message.senderId === currentUserId}
            grouped={row.grouped}
            sender={
              senders[row.message.senderId] ?? {
                userId: row.message.senderId,
                name: 'User',
                avatarUrl: null,
              }
            }
            senders={senders}
            getLiveMessage={getLiveMessage}
            highlighted={highlightedMessageId === row.message.id}
            onDelete={onDelete}
            onEdit={onEdit}
            onReply={onReply}
            onJumpToMessage={onJumpToMessage}
          />
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

type RenderRow =
  | { kind: 'day'; day: string }
  | { kind: 'message'; message: ChatMessage; grouped: boolean }

/**
 * Escape a UUID for use in a CSS attribute selector. UUIDs only contain
 * [0-9a-f-], all of which are CSS-safe, but we still route through the
 * browser's CSS.escape when available to future-proof against other id
 * shapes and to satisfy the "never trust strings in selectors" rule.
 */
function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)
}

function useRenderRows(messages: ChatMessage[]): RenderRow[] {
  const rows: RenderRow[] = []
  let lastDay: string | null = null
  let prev: ChatMessage | null = null
  for (const m of messages) {
    const day = new Date(m.createdAt).toDateString()
    if (day !== lastDay) {
      rows.push({ kind: 'day', day })
      lastDay = day
      prev = null
    }
    const grouped =
      prev !== null &&
      prev.kind !== 'SYSTEM' &&
      m.kind !== 'SYSTEM' &&
      prev.senderId === m.senderId &&
      new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() <
        GROUP_WINDOW_MS
    rows.push({ kind: 'message', message: m, grouped })
    prev = m
  }
  return rows
}
