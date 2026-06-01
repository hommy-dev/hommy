'use client'

import { usePlatformPresence } from './use-platform-presence'

/**
 * Mount at the top of each dashboard layout. Opens the client's single
 * connection to the `presence:platform` channel, tracks self, and
 * drives the reactive presence store consumed by hooks across the app.
 *
 * Renders nothing. Pair with <ChatStoreHydrator>.
 */
export function PlatformPresenceHydrator({
  userId,
  role,
}: {
  userId: string
  role: 'HOMEOWNER' | 'CONTRACTOR' | 'ADMIN'
}) {
  usePlatformPresence(userId, role)
  return null
}
