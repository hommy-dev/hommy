/**
 * Canonical naming for chat realtime resources. Keeping this in one place
 * prevents drift between the client subscribe, server broadcast, and the
 * SQL policy on `realtime.messages` (which matches `chat:<uuid>` literally).
 */

export const CHAT_CHANNEL_PREFIX = 'chat'

export const CHAT_EVENTS = {
  MESSAGE_NEW: 'message:new',
} as const

export type ChatEventName = (typeof CHAT_EVENTS)[keyof typeof CHAT_EVENTS]

export function chatChannelName(conversationId: string): string {
  return `${CHAT_CHANNEL_PREFIX}:${conversationId}`
}
