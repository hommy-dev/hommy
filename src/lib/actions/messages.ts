'use server'

// Messaging actions for the universal conversation graph (docs §6). Text-only
// MVP (D5): no attachments, no leakage scan, no cold-open. System events (quote
// sent/accepted) are plain `messages` rows with sender_type='system'.

import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorMembers, conversationParticipants, messages, users } from '@/lib/db/schema'
import { getRequiredUserId } from '@/lib/auth/session'
import {
  getConversationRecipientUserIds,
  listMessages,
  meConditionForUser,
  resolveParticipantForUser,
  type ParticipantIdentity,
  type ThreadMessage,
} from '@/lib/data/conversations'
import { sendNotification } from '@/lib/notifications'
import { broadcastUserEvent } from '@/lib/realtime/user-events'
import { sendRealtimeBroadcast } from '@/lib/realtime/broadcast'

type Fail<E extends string> = { ok: false; error: E; message: string }

const bodySchema = z.string().trim().min(1, 'Message is required').max(2000)

export type SendMessageResult =
  | { ok: true; message: ThreadMessage }
  | Fail<'UNAUTHENTICATED' | 'INVALID_INPUT' | 'NOT_MEMBER' | 'DB_ERROR'>

export async function sendMessage(conversationId: string, rawBody: string): Promise<SendMessageResult> {
  const userId = await getRequiredUserId()

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return { ok: false, error: 'INVALID_INPUT', message: parsed.error.issues[0]?.message ?? 'Invalid message.' }
  }
  const body = parsed.data

  // One round-trip: resolve the viewer's participant identity (folds the
  // contractor-seats lookup into the query) — also the authorization gate.
  const me = await resolveParticipantForUser(conversationId, userId)
  if (!me) return { ok: false, error: 'NOT_MEMBER', message: 'You are not part of this conversation.' }

  let row: { id: string; createdAt: Date }
  try {
    const [inserted] = await db
      .insert(messages)
      .values({ conversationId, senderType: me.type, senderId: me.id, body, channel: 'platform' })
      .returning({ id: messages.id, createdAt: messages.createdAt })
    row = inserted
  } catch (err) {
    console.error('[sendMessage] insert failed', err)
    return { ok: false, error: 'DB_ERROR', message: 'Could not send your message.' }
  }

  const createdAt = row.createdAt.toISOString()
  const message: ThreadMessage = {
    id: row.id,
    senderType: me.type,
    senderId: me.id,
    body,
    meta: null,
    createdAt,
    isMine: true,
  }

  // Live fan-out (fire-and-forget) — the row is already committed.
  //  • chat:{id} carries the full message so open threads append it.
  //  • each participant's user:{id} gets an inbox-rail patch (incl. the sender,
  //    so their own sidebar updates), and every OTHER participant a notification.
  void sendRealtimeBroadcast({
    topic: `chat:${conversationId}`,
    event: 'message:new',
    payload: message,
  }).catch((e) => console.error('[sendMessage] chat broadcast threw', e))

  void fanOutInbox(conversationId, me, userId, body, createdAt).catch((e) =>
    console.error('[sendMessage] inbox fan-out threw', e),
  )

  return { ok: true, message }
}

export type MarkReadResult = { ok: true } | Fail<'UNAUTHENTICATED' | 'NOT_MEMBER' | 'DB_ERROR'>

export async function markConversationRead(conversationId: string): Promise<MarkReadResult> {
  const userId = await getRequiredUserId()

  try {
    // One round-trip: stamp last_read_at on the viewer's participant row(s)
    // directly. An empty result means they aren't a participant.
    const updated = await db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          meConditionForUser(userId),
        ),
      )
      .returning({ id: conversationParticipants.id })
    if (updated.length === 0) {
      return { ok: false, error: 'NOT_MEMBER', message: 'You are not part of this conversation.' }
    }
    return { ok: true }
  } catch (err) {
    console.error('[markConversationRead] failed', err)
    return { ok: false, error: 'DB_ERROR', message: 'Could not update.' }
  }
}

export type LoadOlderResult =
  | { ok: true; messages: ThreadMessage[]; hasMore: boolean }
  | Fail<'UNAUTHENTICATED' | 'NOT_MEMBER' | 'INVALID_INPUT'>

export async function loadOlderMessages(
  conversationId: string,
  beforeIso: string,
): Promise<LoadOlderResult> {
  const userId = await getRequiredUserId()
  const me = await resolveParticipantForUser(conversationId, userId)
  if (!me) return { ok: false, error: 'NOT_MEMBER', message: 'You are not part of this conversation.' }
  if (!beforeIso || Number.isNaN(Date.parse(beforeIso))) {
    return { ok: false, error: 'INVALID_INPUT', message: 'Invalid cursor.' }
  }

  const page = await listMessages(conversationId, { type: me.type, id: me.id }, { before: beforeIso, limit: 40 })
  return { ok: true, messages: page.messages, hasMore: page.hasMore }
}

/**
 * Patch every participant's inbox rail (sender included, so their own sidebar
 * reflects the message), and push a notification to everyone but the sender.
 * The rail event carries a preview + timestamp so clients update in place
 * without a server round-trip; `mine` marks the recipients who share the
 * sender's participant identity (the sending user, or all members of the sending
 * company) so the conversation doesn't show as unread for them.
 */
async function fanOutInbox(
  conversationId: string,
  sender: ParticipantIdentity,
  senderUserId: string,
  body: string,
  createdAt: string,
): Promise<void> {
  // excludeUserId '' removes nobody → every participant user, sender included.
  const allIds = await getConversationRecipientUserIds(conversationId, '')
  if (allIds.length === 0) return
  const preview = body.slice(0, 140)

  // Users for whom this message is "their own" — same participant identity as the
  // sender: the sending user, or every active member of the sending company.
  let mineUserIds: Set<string>
  if (sender.type === 'contractor') {
    const members = await db
      .select({ userId: contractorMembers.userId })
      .from(contractorMembers)
      .where(and(eq(contractorMembers.contractorId, sender.id), eq(contractorMembers.status, 'active')))
    mineUserIds = new Set(members.map((m) => m.userId))
  } else {
    mineUserIds = new Set([sender.id])
  }

  const others = allIds.filter((uid) => uid !== senderUserId)

  // Role lookup only for the notification deep links (others only).
  const roleById = new Map<string, string>()
  if (others.length > 0) {
    const roleRows = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(inArray(users.id, others))
    for (const r of roleRows) roleById.set(r.id, r.role)
  }

  await Promise.all([
    ...allIds.map((uid) =>
      broadcastUserEvent(uid, 'message:new', {
        conversationId,
        preview,
        createdAt,
        mine: mineUserIds.has(uid),
      }),
    ),
    ...others.map((uid) =>
      sendNotification({
        userId: uid,
        type: 'MESSAGE',
        title: 'New message',
        body: preview,
        actionUrl: `/${roleById.get(uid) ?? 'homeowner'}/messages/${conversationId}`,
        entityType: 'MESSAGE',
        entityId: conversationId,
        sendEmail: false,
        sendSms: false,
      }).catch((e) => console.error('[sendMessage] notify error', { uid, e })),
    ),
  ])
}
