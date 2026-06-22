// ============================================================
// User-channel events — server emits, client refreshes.
//
// All events flow through the private `user:{userId}` channel (RLS policy in
// drizzle/0001_rls_and_realtime.sql scopes it to its owner). Each role layout
// mounts useRealtimeUserEvents() once — one subscription per session no matter
// how many list pages are open.
//
// Server actions / Inngest jobs call these helpers AFTER the DB commit, so the
// broadcast is authoritative. A dropped broadcast just means the change shows
// on the next navigation instead of instantly — broadcasts are UX on top of the
// source-of-truth DB write, never the source of truth themselves.
// ============================================================

import { sendRealtimeBroadcast } from './broadcast'

// ---------- event names (Hommy v2 surface) ----------

export const USER_EVENTS = {
  // Notification bell (handled by NotificationBell, not the refresh hook).
  NOTIFICATION_NEW: 'notification:new',

  // Lead lifecycle (contractor side)
  LEAD_NEW: 'lead:new',         // a new lead was offered to this company
  LEAD_UPDATED: 'lead:updated', // recipient status changed (engaged / locked / lost)

  // Quote / estimate lifecycle
  QUOTE_NEW: 'quote:new',           // homeowner received a quote
  QUOTE_ACCEPTED: 'quote:accepted', // contractor's quote was accepted (job won)

  // Messaging
  MESSAGE_NEW: 'message:new', // a conversation the user participates in got a message

  // Wallet
  CREDITS_CHANGED: 'credits:changed', // company credit balance changed
} as const

export type UserEventName = (typeof USER_EVENTS)[keyof typeof USER_EVENTS]

// ---------- typed payload shapes ----------
// Keep these tight — just enough for the client to know WHAT changed and decide
// whether to refresh. The DB is the source of truth for everything else.

export type UserEventPayload = {
  'notification:new': {
    id: string
    type: string
    title: string
    body: string
    actionUrl: string | null
    entityType: string | null
    entityId: string | null
    createdAt: string
  }
  'lead:new': { leadId: string }
  'lead:updated': { leadId: string }
  'quote:new': { estimateId: string }
  'quote:accepted': { estimateId: string }
  // `preview`/`createdAt`/`mine` are present for chat messages (let the inbox
  // rail patch in place); system-message broadcasts omit them and fall back to a
  // soft refresh. `mine` marks the sender's own copy (no refresh needed).
  'message:new': {
    conversationId: string
    preview?: string
    createdAt?: string
    mine?: boolean
  }
  'credits:changed': { balance: number }
}

// ---------- helpers ----------

/**
 * Fire a single typed event on a user's channel. Fire-and-forget — never throws.
 *
 *   await db.update(...)
 *   void broadcastUserEvent(userId, 'lead:new', { leadId })
 */
export function broadcastUserEvent<E extends UserEventName>(
  userId: string,
  event: E,
  payload: UserEventPayload[E],
): Promise<{ ok: boolean }> {
  return sendRealtimeBroadcast({
    topic: `user:${userId}`,
    event,
    payload,
  }).catch((err) => {
    console.error('[user-events] broadcast failed', { userId, event, err })
    return { ok: false }
  })
}

/**
 * Fan-out — the same event to many users in one request. Used by the matching
 * engine to notify N contractors about a new lead simultaneously.
 */
export function broadcastUserEventToMany<E extends UserEventName>(
  userIds: string[],
  event: E,
  payload: UserEventPayload[E],
): Promise<{ ok: boolean }> {
  if (userIds.length === 0) return Promise.resolve({ ok: true })
  return sendRealtimeBroadcast(
    userIds.map((userId) => ({ topic: `user:${userId}`, event, payload })),
  ).catch((err) => {
    console.error('[user-events] fan-out failed', { count: userIds.length, event, err })
    return { ok: false }
  })
}
