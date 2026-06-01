import type { ConversationRow } from '@/lib/data/chat'
import type { StoredConversation } from './chat-store'

/**
 * Server → store-shape conversion. Pure function, safe on both sides of
 * the RSC boundary. Dates become ISO strings so the payload is JSON.
 */
export function toStoredConversation(c: ConversationRow): StoredConversation {
  return {
    id: c.id,
    projectId: c.projectId,
    quoteId: c.quoteId,
    jobId: c.jobId,
    homeownerUserId: c.homeownerUserId,
    contractorUserId: c.contractorUserId,
    homeownerFullName: c.homeownerFullName,
    homeownerAvatarUrl: c.homeownerAvatarUrl,
    contractorBusinessName: c.contractorBusinessName,
    contractorAvatarUrl: c.contractorAvatarUrl,
    projectTitle: c.projectTitle,
    projectCity: c.projectCity,
    projectState: c.projectState,
    projectStatus: c.projectStatus,
    quoteStatus: c.quoteStatus,
    jobStatus: c.jobStatus,
    lastMessageAt: c.lastMessageAt
      ? new Date(c.lastMessageAt as Date | string).toISOString()
      : null,
    lastMessagePreview: c.lastMessagePreview,
    lastMessageSenderId: null, // ConversationRow doesn't expose this; fine — the UI doesn't need it
    unreadCount: c.unreadCountForMe ?? 0,
  }
}
