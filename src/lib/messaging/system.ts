// Server-only helpers for posting SYSTEM messages into a conversation (quote
// sent, quote accepted, …). NOT a server action — imported only by other server
// actions. System events are plain `messages` rows with sender_type='system'
// and a human-readable body (D5: no separate payload column).

import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversations, messages } from '@/lib/db/schema'
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
  const [row] = await db
    .insert(messages)
    .values({ conversationId, senderType: 'system', senderId: null, body, channel: 'platform' })
    .returning({ id: messages.id, createdAt: messages.createdAt })

  void sendRealtimeBroadcast({
    topic: `chat:${conversationId}`,
    event: 'message:new',
    payload: {
      id: row.id,
      senderType: 'system',
      senderId: null,
      body,
      createdAt: row.createdAt.toISOString(),
      isMine: false,
    },
  }).catch((e) => console.error('[postSystemMessage] broadcast threw', e))

  const userIds = await getConversationRecipientUserIds(conversationId, '')
  await Promise.all(userIds.map((uid) => broadcastUserEvent(uid, 'message:new', { conversationId })))
}
