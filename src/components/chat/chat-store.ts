'use client'

/**
 * Chat client store — single source of truth for the sidebar.
 *
 * Built on React's `useSyncExternalStore` so hydration from SSR is clean
 * and we don't need a third-party state lib. The store is a module-level
 * singleton; every component that uses a `useXxx` selector below gets
 * reactive updates.
 *
 * Data flow:
 *   • On mount the ChatStoreHydrator seeds the store from SSR-rendered data.
 *   • The user-inbox realtime subscription pushes `conversation:bumped`
 *     events here (preview, unread count, last-message time).
 *   • The open thread's `chat:{id}` subscription also bumps this store for
 *     the active conversation so preview/unread stay consistent even when
 *     the broadcast for my own send comes back to me.
 *   • Optimistic mark-read zeros the local unread for a conversation
 *     immediately while the server UPDATE runs in the background.
 *
 * Why not useContext: we want this store to be available to non-descendant
 * components too (the main app sidebar "Messages" nav badge is not a
 * descendant of the chat layout). A module-level store is the simplest
 * way to share across independent trees.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react'

// ----- Types -----------------------------------------------------------

export type StoredConversation = {
  id: string
  projectId: string
  quoteId: string | null
  jobId: string | null
  homeownerUserId: string
  contractorUserId: string
  homeownerFullName: string
  homeownerAvatarUrl: string | null
  contractorBusinessName: string
  contractorAvatarUrl: string | null
  projectTitle: string
  projectCity: string
  projectState: string
  projectStatus: string
  quoteStatus: string | null
  jobStatus: string | null
  // live-updated fields
  lastMessageAt: string | null
  lastMessagePreview: string | null
  lastMessageSenderId: string | null
  unreadCount: number
}

type State = {
  viewerUserId: string | null
  conversations: Record<string, StoredConversation>
  order: string[] // conversation ids, most recent activity first
  /**
   * Conversation the user is actively viewing (open thread). When a
   * message arrives for this conversation, we do NOT increment unread
   * — the user is reading it right now. Set by ChatWindow on mount.
   */
  activeConversationId: string | null
}

// ----- Store -----------------------------------------------------------

const listeners = new Set<() => void>()
let state: State = {
  viewerUserId: null,
  conversations: {},
  order: [],
  activeConversationId: null,
}

function emit() {
  for (const l of listeners) l()
}

function setState(mutator: (s: State) => State) {
  const next = mutator(state)
  if (next === state) return
  state = next
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return state
}

// ----- Mutations -------------------------------------------------------

/**
 * Hydrate from SSR. Called once per navigation via <ChatStoreHydrator>.
 * If the server re-rendered with fresh data (e.g. a newly created
 * conversation), we merge — existing ids keep their live state but are
 * refreshed; ids the server dropped get removed.
 */
export function hydrateConversations(
  viewerUserId: string,
  incoming: StoredConversation[],
) {
  setState((s) => {
    const next: Record<string, StoredConversation> = {}
    const firstHydration = s.viewerUserId === null
    for (const c of incoming) {
      const existing = s.conversations[c.id]
      if (!existing) {
        // Brand-new conversation (not seen before) — trust server wholesale.
        next[c.id] = c
        continue
      }
      if (firstHydration) {
        // First hydration of this session — server is authoritative.
        next[c.id] = c
        continue
      }
      // Re-hydration after first load. Refresh server-owned fields
      // (names, avatars, statuses, preview text) but keep local-owned
      // live state so we don't resurrect stale unread counts or
      // overwrite a just-arrived broadcast with older SSR data.
      const serverNewer =
        !existing.lastMessageAt ||
        (c.lastMessageAt !== null && c.lastMessageAt > existing.lastMessageAt)
      next[c.id] = {
        ...c,
        lastMessageAt: serverNewer ? c.lastMessageAt : existing.lastMessageAt,
        lastMessagePreview: serverNewer
          ? c.lastMessagePreview
          : existing.lastMessagePreview,
        lastMessageSenderId: serverNewer
          ? c.lastMessageSenderId
          : existing.lastMessageSenderId,
        // Unread is locally authoritative after the first load.
        // mark-read / applyBumped / clearUnreadLocal drive this;
        // the server view is racey against the user's own just-happened
        // actions.
        unreadCount: existing.unreadCount,
      }
    }
    const order = Object.values(next)
      .sort((a, b) => sortKey(b) - sortKey(a))
      .map((c) => c.id)
    return {
      viewerUserId,
      conversations: next,
      order,
      activeConversationId: s.activeConversationId,
    }
  })
}

/**
 * Apply an incoming `conversation:bumped` broadcast from the user-inbox
 * channel (or from the open thread). Increments unread when the message
 * is from someone else.
 */
export function applyBumped(input: {
  conversationId: string
  preview: string
  senderId: string
  at: string
}) {
  setState((s) => {
    const conv = s.conversations[input.conversationId]
    if (!conv) return s
    // Dedupe: if this exact bump has already been applied (same `at` and
    // same sender), don't re-increment. The server broadcasts on both
    // chat:{id} AND user:{userId} for each message — both arrive at this
    // client — and we want one count per message, not two.
    if (
      conv.lastMessageAt === input.at &&
      conv.lastMessageSenderId === input.senderId
    ) {
      // Still update preview in case it changed (rare, but cheap).
      if (conv.lastMessagePreview !== input.preview) {
        return {
          ...s,
          conversations: {
            ...s.conversations,
            [input.conversationId]: { ...conv, lastMessagePreview: input.preview },
          },
        }
      }
      return s
    }
    const isMine = s.viewerUserId === input.senderId
    const isActive = s.activeConversationId === input.conversationId
    // Don't increment unread if: I sent it, or I'm currently viewing the thread.
    const shouldIncrement = !isMine && !isActive
    const updated: StoredConversation = {
      ...conv,
      lastMessageAt: input.at,
      lastMessagePreview: input.preview,
      lastMessageSenderId: input.senderId,
      unreadCount: shouldIncrement ? conv.unreadCount + 1 : conv.unreadCount,
    }
    const nextMap = { ...s.conversations, [input.conversationId]: updated }
    // Move this conversation to the top of the order.
    const order = [
      input.conversationId,
      ...s.order.filter((id) => id !== input.conversationId),
    ]
    return { ...s, conversations: nextMap, order }
  })
}

/**
 * Optimistically clear unread for a conversation. Called when the user
 * opens a thread and when they send a message. Server mark-read runs in
 * parallel; if it fails, the store self-corrects on the next bumped
 * event that arrives from the other side.
 */
export function clearUnreadLocal(conversationId: string) {
  setState((s) => {
    const conv = s.conversations[conversationId]
    if (!conv || conv.unreadCount === 0) return s
    return {
      ...s,
      conversations: {
        ...s.conversations,
        [conversationId]: { ...conv, unreadCount: 0 },
      },
    }
  })
}

/**
 * Mark a conversation as "actively viewed". While active, incoming
 * broadcasts for this conversation do not increment unread — the user
 * is reading them in real time. ChatWindow calls this on mount.
 */
export function setActiveConversation(conversationId: string | null) {
  setState((s) => {
    if (s.activeConversationId === conversationId) return s
    return { ...s, activeConversationId: conversationId }
  })
}

/**
 * For when you send a message locally (optimistic) — updates preview
 * without incrementing unread (it's from you).
 */
export function applyOwnSend(input: {
  conversationId: string
  preview: string
  at: string
}) {
  setState((s) => {
    const conv = s.conversations[input.conversationId]
    if (!conv || !s.viewerUserId) return s
    const updated: StoredConversation = {
      ...conv,
      lastMessageAt: input.at,
      lastMessagePreview: input.preview,
      lastMessageSenderId: s.viewerUserId,
      // sending doesn't change unread for me
    }
    const order = [
      input.conversationId,
      ...s.order.filter((id) => id !== input.conversationId),
    ]
    return {
      ...s,
      conversations: { ...s.conversations, [input.conversationId]: updated },
      order,
    }
  })
}

// ----- Selectors / hooks -----------------------------------------------

export function useConversations(): StoredConversation[] {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return snap.order
    .map((id) => snap.conversations[id])
    .filter((c): c is StoredConversation => Boolean(c))
}

export function useTotalUnread(): number {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  let total = 0
  for (const id of snap.order) {
    const c = snap.conversations[id]
    if (c && c.unreadCount > 0) total += 1 // count conversations, not messages
  }
  return total
}

export function useConversation(
  id: string | null,
): StoredConversation | undefined {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return id ? snap.conversations[id] : undefined
}

export function useViewerId(): string | null {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return snap.viewerUserId
}

/**
 * Re-hydrates the store on mount and whenever the SSR-passed data changes.
 * Used by <ChatStoreHydrator>.
 */
export function useHydrateConversations(
  viewerUserId: string,
  conversations: StoredConversation[],
) {
  // ref-equal short-circuit via JSON key so parent can pass a new array
  // every render without causing churn.
  const key = JSON.stringify(conversations.map((c) => [c.id, c.lastMessageAt, c.unreadCount]))
  const hydrate = useCallback(() => {
    hydrateConversations(viewerUserId, conversations)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerUserId, key])
  useEffect(() => {
    hydrate()
  }, [hydrate])
}

function sortKey(c: StoredConversation): number {
  if (c.lastMessageAt) return new Date(c.lastMessageAt).getTime()
  return 0
}
