// ============================================================
// User-channel events — server emits, client refreshes.
//
// All events flow through the existing `user:{userId}` private channel
// (see migration 0009_chat_realtime_v2.sql for the RLS policy that
// scopes it to its owner). The contractor and homeowner layouts both
// mount useRealtimeUserEvents() once — one subscription per session,
// regardless of how many list pages the user opens.
//
// Server actions call the helper *after* DB commit so the broadcast is
// authoritative. If the broadcast fails (network blip, restart) the
// next page navigation still re-fetches fresh data — broadcasts are
// pure UX sprinkles on top of the DB write.
// ============================================================

import { sendRealtimeBroadcast } from './broadcast'

// ---------- event names ----------

export const USER_EVENTS = {
  // Notification-bell event (Phase 4.1) — kept here too so anyone
  // grepping for "user channel events" sees the full surface.
  NOTIFICATION_NEW: 'notification:new',

  // Lead lifecycle
  LEAD_NEW:      'lead:new',
  LEAD_VIEWED:   'lead:viewed',
  LEAD_DECLINED: 'lead:declined',

  // Quote lifecycle
  QUOTE_NEW:       'quote:new',
  QUOTE_ACCEPTED:  'quote:accepted',
  QUOTE_REJECTED:  'quote:rejected',
  QUOTE_WITHDRAWN: 'quote:withdrawn',

  // Project / job
  PROJECT_STATUS_CHANGED: 'project:status-changed',
  JOB_STATUS_CHANGED:     'job:status-changed',
  PAYMENT_RELEASED:       'payment:released',

  // Site-visit fees (Phase 1)
  SITE_VISIT_REQUESTED: 'site-visit:requested',
  SITE_VISIT_SCHEDULED: 'site-visit:scheduled',
} as const

export type UserEventName = (typeof USER_EVENTS)[keyof typeof USER_EVENTS]

// ---------- typed payload shapes ----------
//
// Keep these tight — the client only needs enough to know *what changed*
// so it can decide whether to refresh and what to toast. The DB write is
// the source of truth for everything else.

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
  'lead:new': {
    // Each matched contractor gets their own lead row keyed by
    // (projectId, contractorId). The client refreshes by projectId and
    // re-fetches the lead — no need to round-trip leadId in the broadcast.
    projectId: string
    projectTitle: string
    jobType: string
    city: string | null
  }
  'lead:viewed': {
    leadId: string
    projectId: string
    contractorBusinessName: string
  }
  'lead:declined': {
    leadId: string
    projectId: string
    contractorBusinessName: string
  }
  'quote:new': {
    quoteId: string
    projectId: string
    contractorBusinessName: string
    totalAmount: number
  }
  'quote:accepted': {
    quoteId: string
    projectId: string
    jobId: string
  }
  'quote:rejected': {
    quoteId: string
    projectId: string
  }
  'quote:withdrawn': {
    quoteId: string
    projectId: string
  }
  'project:status-changed': {
    projectId: string
    status: string
  }
  'job:status-changed': {
    jobId: string
    status: string
  }
  'payment:released': {
    jobId: string
    amount: number
  }
  'site-visit:requested': {
    projectId: string
    siteVisitId: string
    feeAmount: number
  }
  'site-visit:scheduled': {
    siteVisitId: string
    acceptedSlot: string
  }
}

// ---------- helper ----------

/**
 * Fire a single typed event on the recipient's user channel.
 * Fire-and-forget — never throws to the caller.
 *
 *   await db.update(...)
 *   void broadcastUserEvent(userId, 'quote:new', { ... })
 *   return { ok: true }
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
 * Same as above but for fan-out — broadcast the same event to many users
 * in a single request. Used by the matching engine to notify N contractors
 * about a new lead simultaneously.
 */
export function broadcastUserEventToMany<E extends UserEventName>(
  userIds: string[],
  event: E,
  payload: UserEventPayload[E],
): Promise<{ ok: boolean }> {
  if (userIds.length === 0) return Promise.resolve({ ok: true })
  return sendRealtimeBroadcast(
    userIds.map((userId) => ({
      topic: `user:${userId}`,
      event,
      payload,
    })),
  ).catch((err) => {
    console.error('[user-events] fan-out broadcast failed', { count: userIds.length, event, err })
    return { ok: false }
  })
}
