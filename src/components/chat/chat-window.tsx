'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { MessageList } from './message-list'
import { MessageComposer, type ComposerReplyTarget } from './message-composer'
import {
  useChatMessages,
  type ChatMessage,
} from './use-chat-messages'
import { useChatSubscription } from './use-chat-subscription'
import { useChatPresence } from './use-chat-presence'
import { useIsUserOnline } from '@/components/presence/presence-store'
import {
  applyBumped,
  applyOwnSend,
  clearUnreadLocal,
  setActiveConversation,
  useConversation,
} from './chat-store'
import {
  deleteMessageAction,
  editMessageAction,
  getMessagesAfterAction,
  loadOlderMessagesAction,
  markConversationReadAction,
  sendMessageAction,
  type AttachmentInput,
} from '@/lib/actions/chat'

type Props = {
  conversationId: string
  currentUserId: string
  /** The other party's user id. Used to detect their online/typing state. */
  otherUserId?: string | null
  /** Display info for every participant that can appear in this thread.
   *  Keyed by userId. Must contain BOTH the current user and the other
   *  party for the header to render correctly. */
  senders: Record<string, { userId: string; name: string; avatarUrl: string | null }>
  initialMessages: ChatMessage[]
  /** Selects which side's CTAs render in SYSTEM message bubbles (e.g.
   *  "Review and accept" only shows for HOMEOWNER on a quote.submitted). */
  viewerRole?: 'HOMEOWNER' | 'CONTRACTOR'
  /** When set, composer is disabled and the message is shown instead. */
  readOnlyReason?: string | null
  footerHint?: React.ReactNode
  className?: string
  header?: React.ReactNode
}

const MARK_READ_DEBOUNCE_MS = 1500

/**
 * The orchestrator for a single conversation:
 *   • live subscription to chat:{conversationId}
 *   • optimistic send (bubble + sidebar preview updates immediately)
 *   • pagination (load older on scroll-up)
 *   • visibility-gated, debounced mark-read (no more stampede)
 *
 * Sidebar / main-app unread badge updates come via the per-user inbox
 * channel that was subscribed to at the app-root layout level, so we
 * don't need a second subscription here for that.
 */
export function ChatWindow({
  conversationId,
  currentUserId,
  otherUserId,
  senders,
  initialMessages,
  viewerRole = 'HOMEOWNER',
  readOnlyReason,
  footerHint,
  className,
  header,
}: Props) {
  // Typing indicator uses per-conversation presence (chat:{id}) — the
  // natural place to scope a "typing in THIS thread" signal.
  // "Online now" uses the platform-wide presence store instead: the
  // dot reflects whether the other party has the app open anywhere,
  // not just whether they're focused on this specific thread.
  const { typingUserIds, emitTyping, clearTyping } = useChatPresence(
    conversationId,
    currentUserId,
  )

  const otherIsTyping = otherUserId ? typingUserIds.includes(otherUserId) : false
  const {
    messages,
    append,
    prepend,
    pushPending,
    confirmPending,
    failPending,
    markDeleted,
    applyEdit,
  } = useChatMessages(initialMessages)

  const [hasMoreOlder, setHasMoreOlder] = useState(
    initialMessages.length >= 40,
  )
  const [loadingOlder, setLoadingOlder] = useState(false)
  const loadingOlderRef = useRef(false)

  // Reply state. Holds the message being replied to so the composer can
  // render its banner and the send action can attach `parentMessageId`.
  // Cleared after a successful send or when the user hits X / Escape.
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)

  // Parent highlight state — when the user clicks a reply card we scroll
  // the parent into view and flash it briefly. Cleared by a timer so the
  // flash doesn't linger.
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(
    null,
  )
  useEffect(() => {
    if (!highlightedMessageId) return
    const t = setTimeout(() => setHighlightedMessageId(null), 1800)
    return () => clearTimeout(t)
  }, [highlightedMessageId])

  const handleJumpToMessage = useCallback((id: string) => {
    // Setting the id even if it's the same as current restarts the timer.
    setHighlightedMessageId(null)
    requestAnimationFrame(() => setHighlightedMessageId(id))
  }, [])

  const handleStartReply = useCallback((m: ChatMessage) => {
    setReplyingTo(m)
  }, [])

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

  // Mark this thread as actively viewed for as long as the component is
  // mounted. The store's `applyBumped` skips unread increments for the
  // active conversation — so incoming broadcasts while you're looking at
  // the thread don't make the badge flicker to 1.
  useEffect(() => {
    setActiveConversation(conversationId)
    return () => setActiveConversation(null)
  }, [conversationId])

  // Catch-up fetch on mount. Next.js Link prefetch captures the /messages/{id}
  // RSC payload *when the sidebar mounts*. If a new message arrives AFTER
  // that prefetch but BEFORE the user clicks, the prefetched page (and
  // therefore our initialMessages) misses it. The realtime subscription
  // only starts delivering AFTER subscribe, so those gap messages are
  // silently dropped.
  //
  // The store's `lastMessageAt` for this conversation is updated live by
  // the per-user inbox broadcast, so it's always current. If it exceeds
  // the newest initialMessage we have, we know there's a gap — fetch it.
  const storeConv = useConversation(conversationId)
  const catchupRanRef = useRef(false)
  useEffect(() => {
    if (catchupRanRef.current) return
    // Wait until the store has hydrated for this conversation.
    if (!storeConv) return
    const newest = messages[messages.length - 1]
    const newestIso = newest?.createdAt ?? null
    const storeIso = storeConv.lastMessageAt
    const hasGap =
      storeIso &&
      (!newestIso || new Date(storeIso).getTime() > new Date(newestIso).getTime())
    if (!hasGap) return
    catchupRanRef.current = true
    void (async () => {
      try {
        const res = await getMessagesAfterAction(conversationId, newestIso)
        if (res.ok) {
          for (const m of res.messages) append(m as ChatMessage)
        }
      } catch (err) {
        console.warn('[chat] catch-up fetch failed', err)
      }
    })()
  }, [storeConv, messages, conversationId, append])

  // Per-thread realtime. Broadcast payload from the server.
  useChatSubscription(conversationId, (event, payload) => {
    if (event === 'message:new') {
      const msg = payload as ChatMessage
      if (!msg || !msg.id) return
      // Ensure shape — broadcast payloads may arrive without attachments
      // array when sent for delete/other events.
      if (!Array.isArray(msg.attachments)) {
        msg.attachments = []
      }
      if (typeof msg.deletedAt === 'undefined') {
        msg.deletedAt = null
      }
      append(msg)
      const preview = msg.content
        ? msg.content.slice(0, 160)
        : msg.attachments.length > 0
          ? attachmentPreview(msg.attachments[0], msg.attachments.length)
          : ''
      applyBumped({
        conversationId,
        preview,
        senderId: msg.senderId,
        at: msg.createdAt,
      })
      return
    }
    if (event === 'message:deleted') {
      const { messageId } = payload as { messageId: string }
      if (!messageId) return
      markDeleted(messageId)
      return
    }
    if (event === 'message:edited') {
      const p = payload as {
        messageId: string
        content: string
        editedAt: string
        isFlagged?: boolean
        flagReason?: ChatMessage['flagReason']
      }
      if (!p.messageId) return
      applyEdit(p.messageId, {
        content: p.content,
        editedAt: p.editedAt,
        isFlagged: p.isFlagged,
        flagReason: p.flagReason,
      })
      return
    }
  })

  // Mark-read, debounced and visibility-gated. Only fires when:
  //   • the tab is visible
  //   • the latest message is from someone else (no point marking my own)
  //   • it's been at least MARK_READ_DEBOUNCE_MS since the last call
  // The server UPDATE is fire-and-forget; the sidebar zeros the badge
  // optimistically via clearUnreadLocal.
  const markReadRef = useRef<number>(0)
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleMarkRead = useCallback(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return
    }
    const last = messages[messages.length - 1]
    if (!last) return
    if (last.senderId === currentUserId) return

    // Optimistic: zero the badge immediately.
    clearUnreadLocal(conversationId)

    // Coalesce calls within the debounce window.
    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current)
    const now = Date.now()
    const elapsed = now - markReadRef.current
    const wait = Math.max(0, MARK_READ_DEBOUNCE_MS - elapsed)
    markReadTimerRef.current = setTimeout(() => {
      markReadRef.current = Date.now()
      void markConversationReadAction(conversationId).catch(() => {})
    }, wait)
  }, [conversationId, currentUserId, messages])

  // Trigger on new incoming messages + on visibility regain.
  useEffect(() => {
    scheduleMarkRead()
  }, [scheduleMarkRead])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVis = () => {
      if (document.visibilityState === 'visible') scheduleMarkRead()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current)
    }
  }, [scheduleMarkRead])

  const handleSend = useCallback(
    async (content: string, attachments: AttachmentInput[] = []) => {
      const nowIso = new Date().toISOString()
      // Preview text shown in the sidebar for this optimistic send.
      const preview = content
        ? content.slice(0, 160)
        : attachments.length > 0
          ? attachmentPreview(attachments[0], attachments.length)
          : ''

      // Capture reply target now (parent state clears after this call).
      const parent = replyingTo
      const parentId = parent?.id ?? null
      const parentPreview: ChatMessage['parentPreview'] = parent
        ? {
            id: parent.id,
            senderId: parent.senderId,
            content: parent.content,
            isDeleted: Boolean(parent.deletedAt),
            firstAttachmentKind: parent.attachments[0]?.kind ?? null,
          }
        : null

      // Optimistic bubble in the thread
      const tempId = pushPending({
        conversationId,
        senderId: currentUserId,
        kind: 'USER',
        systemPayload: null,
        content,
        isFlagged: false,
        flagReason: null,
        isRead: false,
        readAt: null,
        createdAt: nowIso,
        deletedAt: null,
        editedAt: null,
        parentMessageId: parentId,
        parentPreview,
        attachments: attachments.map((a, i) => ({
          id: `tmp-att-${i}`,
          messageId: 'tmp',
          kind: a.kind,
          storagePath: a.storagePath,
          resourceType: a.resourceType,
          mime: a.mime,
          sizeBytes: a.sizeBytes,
          durationMs: a.durationMs ?? null,
          width: a.width ?? null,
          height: a.height ?? null,
          waveformPeaks: a.waveformPeaks ?? null,
          originalFilename: a.originalFilename ?? null,
        })),
      })
      applyOwnSend({ conversationId, preview, at: nowIso })

      clearTyping()
      // Clear the reply state as soon as the send is inflight — no point
      // holding it hostage to the server round-trip. If the send fails,
      // we leave the message in "failed" state in the thread; user can
      // retry or delete.
      setReplyingTo(null)

      const res = await sendMessageAction(
        conversationId,
        content,
        attachments,
        parentId,
      )
      if (!res.ok) {
        failPending(tempId)
        return { ok: false as const, message: res.message }
      }
      confirmPending(tempId, res.message as ChatMessage)
      return { ok: true as const, flagged: res.flagged }
    },
    [
      conversationId,
      currentUserId,
      replyingTo,
      pushPending,
      confirmPending,
      failPending,
      clearTyping,
    ],
  )

  const handleDelete = useCallback(async (messageId: string) => {
    const res = await deleteMessageAction(messageId)
    // Broadcasts handle the rest — our own thread gets `message:deleted`
    // via chat:{id} and reconciles the row.
    return res
  }, [])

  const handleEdit = useCallback(
    async (messageId: string, newContent: string) => {
      // Optimistic: apply locally so the UI feels instant. Server broadcast
      // will re-apply with the authoritative editedAt moments later.
      applyEdit(messageId, {
        content: newContent,
        editedAt: new Date().toISOString(),
      })
      const res = await editMessageAction(messageId, newContent)
      return res
    },
    [applyEdit],
  )

  const handleLoadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasMoreOlder) return
    const oldest = messages[0]
    if (!oldest) return
    loadingOlderRef.current = true
    setLoadingOlder(true)
    try {
      const res = await loadOlderMessagesAction(
        conversationId,
        oldest.createdAt,
      )
      if (res.ok) {
        prepend(res.messages as ChatMessage[])
        setHasMoreOlder(res.hasMore)
      } else {
        setHasMoreOlder(false)
      }
    } catch (err) {
      console.error('[Chat] loadOlder failed', err)
    } finally {
      loadingOlderRef.current = false
      setLoadingOlder(false)
    }
  }, [conversationId, hasMoreOlder, messages, prepend])

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col bg-muted/20', className)}>
      {header}
      {/* Typing indicator — only visible while the other party is
          actively typing. Stays out of the way otherwise (no reserved
          strip — "Online now" moved to the avatar dot in the page
          header so it doesn't steal a whole line). */}
      {otherIsTyping ? (
        <div className="flex h-5 lg:h-[1.389vw] items-center gap-1.5 lg:gap-[0.417vw] border-b border-border/40 bg-background/60 px-4 lg:px-[1.111vw] text-[11px] lg:text-[0.764vw] text-muted-foreground">
          <TypingDots />
          <span>typing…</span>
        </div>
      ) : null}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        senders={senders}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onReply={handleStartReply}
        onJumpToMessage={handleJumpToMessage}
        viewerRole={viewerRole}
        highlightedMessageId={highlightedMessageId}
        onLoadOlder={hasMoreOlder ? handleLoadOlder : undefined}
        hasMoreOlder={hasMoreOlder}
        loadingOlder={loadingOlder}
        emptyState={
          <div className="text-center text-sm lg:text-[0.972vw] text-muted-foreground">
            No messages yet. Say hello.
          </div>
        }
      />
      {readOnlyReason ? (
        <div className="border-t border-border bg-muted/40 p-3 lg:p-[0.833vw] text-center text-xs lg:text-[0.833vw] text-muted-foreground">
          {readOnlyReason}
        </div>
      ) : (
        <MessageComposer
          conversationId={conversationId}
          onSend={handleSend}
          onType={emitTyping}
          footerHint={footerHint}
          replyingTo={buildReplyTarget(replyingTo, senders)}
          onCancelReply={handleCancelReply}
        />
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <span aria-hidden className="inline-flex items-end gap-0.5 lg:gap-[0.139vw]">
      <span className="inline-block size-1 lg:size-[0.278vw] animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
      <span className="inline-block size-1 lg:size-[0.278vw] animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
      <span className="inline-block size-1 lg:size-[0.278vw] animate-bounce rounded-full bg-muted-foreground" />
    </span>
  )
}

function attachmentPreview(
  att: { kind: string; originalFilename?: string | null },
  count: number,
): string {
  if (count > 1) return `${count} attachments`
  if (att.kind === 'IMAGE') return '📷 Photo'
  if (att.kind === 'AUDIO') return '🎤 Voice message'
  if (att.kind === 'VIDEO') return '🎥 Video'
  return `📎 ${att.originalFilename ?? 'File'}`
}

/**
 * Builds the composer's reply banner descriptor from the full parent
 * message + senders map. Returns null when there's no reply in progress
 * so the composer can short-circuit its banner render.
 */
function buildReplyTarget(
  parent: ChatMessage | null,
  senders: Record<string, { userId: string; name: string; avatarUrl: string | null }>,
): ComposerReplyTarget | null {
  if (!parent) return null
  const senderName = senders[parent.senderId]?.name ?? 'User'
  const preview = parent.content
    ? parent.content.length > 80
      ? `${parent.content.slice(0, 80)}…`
      : parent.content
    : parent.attachments.length > 0
      ? attachmentPreview(parent.attachments[0], parent.attachments.length)
      : ''
  return { id: parent.id, senderName, preview }
}
