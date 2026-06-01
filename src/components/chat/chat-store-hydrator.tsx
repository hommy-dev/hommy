'use client'

import {
  useHydrateConversations,
  type StoredConversation,
} from './chat-store'
import { useUserInboxSubscription } from './use-user-inbox-subscription'

/**
 * Mounted at the top of a logged-in layout. Seeds the chat store from SSR
 * data and starts the per-user inbox realtime subscription so the sidebar
 * + main nav badge stay live across the whole app.
 *
 * Safe to mount on every authenticated page — if the user has no
 * conversations, the store stays empty and the subscription is inert.
 */
export function ChatStoreHydrator({
  viewerUserId,
  conversations,
}: {
  viewerUserId: string
  conversations: StoredConversation[]
}) {
  useHydrateConversations(viewerUserId, conversations)
  useUserInboxSubscription(viewerUserId)
  return null
}
