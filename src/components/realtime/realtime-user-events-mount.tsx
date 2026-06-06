'use client'

import { useRealtimeUserEvents, type Role } from './use-realtime-user-events'

type Props = {
  userId: string
  role: Role
}

/**
 * Tiny wrapper so the server-component layouts can mount the realtime hook
 * without becoming client components themselves. Renders nothing.
 */
export function RealtimeUserEventsMount({ userId, role }: Props) {
  useRealtimeUserEvents(userId, role)
  return null
}
