// Server-only helpers for posting SYSTEM messages into a conversation (quote
// sent, quote accepted, …). NOT a server action — imported only by other server
// actions. System events are plain `messages` rows with sender_type='system'
// and a human-readable body (D5: no separate payload column).

import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversations, messages, type MessageMeta } from '@/lib/db/schema'
import { sendRealtimeBroadcast } from '@/lib/realtime/broadcast'
import { broadcastUserEvent } from '@/lib/realtime/user-events'
import { getConversationRecipientUserIds } from '@/lib/data/conversations'

/** The conversation opened for a project at engage time (or null). */
export async function getProjectConversationId(projectId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.contextType, 'project'), eq(conversations.contextId, projectId)))
    .limit(1)
  return row?.id ?? null
}

/** Insert a system message and broadcast it live (thread + every participant's inbox). */
export async function postSystemMessage(conversationId: string, body: string): Promise<void> {
  await postSystemMessageWithMeta(conversationId, body, null)
}

/**
 * A system message that carries a rich payload (e.g. a quote) so the thread can
 * render a card instead of plain text. Falls back gracefully to the body text.
 */
export async function postQuoteMessage(
  conversationId: string,
  body: string,
  meta: Extract<MessageMeta, { kind: 'quote' }>,
): Promise<void> {
  await postSystemMessageWithMeta(conversationId, body, meta)
}

/**
 * Post a lifecycle auto-message (quote accepted, job completed, …). The thread
 * renders it as a LEFT/RIGHT bubble owned by `actor`, with text personalized per
 * viewer; `fallbackBody` is the plain text used on non-thread surfaces.
 */
export async function postEventMessage(
  conversationId: string,
  fallbackBody: string,
  meta: Extract<MessageMeta, { kind: 'event' }>,
): Promise<void> {
  await postSystemMessageWithMeta(conversationId, fallbackBody, meta)
}

/**
 * Flip an already-posted quote card to a new status (accepted / rejected) so it
 * stops (or starts) offering its Accept button. Scoped to quote-kind rows for the
 * given estimate(s). Best-effort: a stale card would still be guarded server-side.
 */
export async function markQuoteMessageStatus(
  estimateIds: string | string[],
  status: 'accepted' | 'rejected',
): Promise<void> {
  const ids = Array.isArray(estimateIds) ? estimateIds : [estimateIds]
  if (ids.length === 0) return
  try {
    await db
      .update(messages)
      .set({ meta: sql`jsonb_set(${messages.meta}, '{status}', ${JSON.stringify(status)}::jsonb)` })
      .where(
        and(
          sql`${messages.meta} ->> 'kind' = 'quote'`,
          inArray(sql`${messages.meta} ->> 'estimateId'`, ids),
        ),
      )
  } catch (e) {
    console.error('[markQuoteMessageStatus] failed', e)
  }
}

/** Back-compat alias — flip a quote card to accepted. */
export async function markQuoteMessageAccepted(estimateId: string): Promise<void> {
  await markQuoteMessageStatus(estimateId, 'accepted')
}

async function postSystemMessageWithMeta(
  conversationId: string,
  body: string,
  meta: MessageMeta | null,
): Promise<void> {
  const [row] = await db
    .insert(messages)
    .values({ conversationId, senderType: 'system', senderId: null, body, channel: 'platform', meta })
    .returning({ id: messages.id, createdAt: messages.createdAt })

  void sendRealtimeBroadcast({
    topic: `chat:${conversationId}`,
    event: 'message:new',
    payload: {
      id: row.id,
      senderType: 'system',
      senderId: null,
      body,
      meta,
      createdAt: row.createdAt.toISOString(),
      isMine: false,
    },
  }).catch((e) => console.error('[postSystemMessage] broadcast threw', e))

  const userIds = await getConversationRecipientUserIds(conversationId, '')
  await Promise.all(userIds.map((uid) => broadcastUserEvent(uid, 'message:new', { conversationId })))
}
