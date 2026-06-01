'use client'

import { useRealtimeUserEvents } from './use-realtime-user-events'

type Props = {
  userId: string
  role: 'HOMEOWNER' | 'CONTRACTOR'
}

/**
 * Tiny wrapper so the server-component layouts can mount the hook
 * without becoming client components themselves. Renders nothing.
 */
export function RealtimeUserEventsMount({ userId, role }: Props) {
  useRealtimeUserEvents(userId, role)
  return null
}
