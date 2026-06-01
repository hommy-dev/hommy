'use server'

import { getFastSession } from '@/lib/auth/fast-session'
import { listConversationsForUser } from '@/lib/data/chat'
import type { StoredConversation } from '@/components/chat/chat-store'
import { toStoredConversation } from '@/components/chat/chat-store-mapper'

/**
 * Resync endpoint for the chat store. Called after the user:{userId}
 * realtime channel reconnects from a CLOSED / TIMED_OUT state so that
 * any missed `conversation:bumped` events get reconciled from the DB.
 *
 * Cheap — it's the same index-backed query the root layout uses, just
 * run on demand from the client. Returns store-shape conversations.
 */
export async function resyncConversationsAction(): Promise<
  { ok: true; conversations: StoredConversation[] } | { ok: false }
> {
  const session = await getFastSession()
  if (!session) return { ok: false }
  const rows = await listConversationsForUser(session.userId)
  return {
    ok: true,
    conversations: rows.map(toStoredConversation),
  }
}
