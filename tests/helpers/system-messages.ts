/**
 * System-message reader.
 *
 * v1-final emits a system message into the conversation thread for
 * every state-machine transition (quote.submitted, walkthrough.requested,
 * deposit.sent, fix_item.flagged, ...). Tests assert these were
 * written with the right payload shape.
 *
 * Requires the integration test DB to be up and migrated. The
 * `kind` column and `system_payload` jsonb were added in migration
 * 0027_v1_final.
 */

import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { messages } from '@/lib/db/schema'

type SystemMessage = {
  id: string
  conversationId: string
  kind: string
  systemPayload: unknown
  createdAt: Date
}

/**
 * Read all system messages on a conversation, oldest first.
 */
export async function getSystemMessages(conversationId: string): Promise<SystemMessage[]> {
  const rows = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      kind: messages.kind,
      systemPayload: messages.systemPayload,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.kind, 'SYSTEM'),
      ),
    )
  return rows
    .map((r) => ({
      id: r.id,
      conversationId: r.conversationId,
      kind: r.kind,
      systemPayload: r.systemPayload,
      createdAt: r.createdAt,
    }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

/**
 * Convenience: find the latest system message of a specific payload
 * `kind` (e.g. 'quote.submitted', 'fix_item.flagged'). Payloads are
 * keyed `{kind, ...}` per the v1-final spec.
 */
export async function findSystemMessage(
  conversationId: string,
  payloadKind: string,
): Promise<SystemMessage | null> {
  const all = await getSystemMessages(conversationId)
  for (let i = all.length - 1; i >= 0; i--) {
    const msg = all[i]
    if (
      typeof msg.systemPayload === 'object' &&
      msg.systemPayload !== null &&
      'kind' in msg.systemPayload &&
      (msg.systemPayload as { kind: string }).kind === payloadKind
    ) {
      return msg
    }
  }
  return null
}

export async function expectSystemMessage(
  conversationId: string,
  payloadKind: string,
): Promise<SystemMessage> {
  const msg = await findSystemMessage(conversationId, payloadKind)
  if (!msg) {
    const all = await getSystemMessages(conversationId)
    throw new Error(
      `Expected system message of kind "${payloadKind}" on conversation ${conversationId} ` +
        `but found: [${all
          .map((m) =>
            typeof m.systemPayload === 'object' && m.systemPayload && 'kind' in m.systemPayload
              ? (m.systemPayload as { kind: string }).kind
              : '?',
          )
          .join(', ')}]`,
    )
  }
  return msg
}
