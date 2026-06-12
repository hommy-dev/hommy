'use server'

// Messaging actions for the universal conversation graph (docs §6). Text-only
// MVP (D5): no attachments, no leakage scan, no cold-open. System events (quote
// sent/accepted) are plain `messages` rows with sender_type='system'.

import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversationParticipants, messages, users } from '@/lib/db/schema'
import { getRequiredUser } from '@/lib/auth/session'
import {
  getConversationRecipientUserIds,
  getUserContractorIds,
  listMessages,
  resolveParticipant,
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
  const user = await getRequiredUser()

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return { ok: false, error: 'INVALID_INPUT', message: parsed.error.issues[0]?.message ?? 'Invalid message.' }
  }
  const body = parsed.data

  const contractorIds = await getUserContractorIds(user.id)
  const me = await resolveParticipant(conversationId, user.id, contractorIds)
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

  const message: ThreadMessage = {
    id: row.id,
    senderType: me.type,
    senderId: me.id,
    body,
    createdAt: row.createdAt.toISOString(),
    isMine: true,
  }

  // Live fan-out (fire-and-forget) — the row is already committed.
  //  • chat:{id} carries the full message so open threads append it.
  //  • each other participant's user:{id} gets a refresh ping + a notification.
  void sendRealtimeBroadcast({
    topic: `chat:${conversationId}`,
    event: 'message:new',
    payload: message,
  }).catch((e) => console.error('[sendMessage] chat broadcast threw', e))

  void notifyOthers(conversationId, user.id, body).catch((e) =>
    console.error('[sendMessage] notify threw', e),
  )

  return { ok: true, message }
}

export type MarkReadResult = { ok: true } | Fail<'UNAUTHENTICATED' | 'NOT_MEMBER' | 'DB_ERROR'>

export async function markConversationRead(conversationId: string): Promise<MarkReadResult> {
  const user = await getRequiredUser()
  const contractorIds = await getUserContractorIds(user.id)
  const me = await resolveParticipant(conversationId, user.id, contractorIds)
  if (!me) return { ok: false, error: 'NOT_MEMBER', message: 'You are not part of this conversation.' }

  try {
    await db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.participantType, me.type),
          eq(conversationParticipants.participantId, me.id),
        ),
      )
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
  const user = await getRequiredUser()
  const contractorIds = await getUserContractorIds(user.id)
  const me = await resolveParticipant(conversationId, user.id, contractorIds)
  if (!me) return { ok: false, error: 'NOT_MEMBER', message: 'You are not part of this conversation.' }
  if (!beforeIso || Number.isNaN(Date.parse(beforeIso))) {
    return { ok: false, error: 'INVALID_INPUT', message: 'Invalid cursor.' }
  }

  const page = await listMessages(conversationId, { type: me.type, id: me.id }, { before: beforeIso, limit: 40 })
  return { ok: true, messages: page.messages, hasMore: page.hasMore }
}

/** Refresh + notify every other participant's users (role-aware deep link). */
async function notifyOthers(conversationId: string, senderUserId: string, body: string): Promise<void> {
  const recipientIds = await getConversationRecipientUserIds(conversationId, senderUserId)
  if (recipientIds.length === 0) return

  const roleRows = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(inArray(users.id, recipientIds))
  const roleById = new Map(roleRows.map((r) => [r.id, r.role]))
  const preview = body.slice(0, 140)

  await Promise.all([
    ...recipientIds.map((uid) => broadcastUserEvent(uid, 'message:new', { conversationId })),
    ...recipientIds.map((uid) =>
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
