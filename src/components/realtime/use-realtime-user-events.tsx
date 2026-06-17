'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { USER_EVENTS } from '@/lib/realtime/user-events'

export type Role = 'contractor' | 'homeowner' | 'admin'

/**
 * One subscription per session — mounted in each role layout.
 *
 * Listens on the private `user:{userId}` channel and triggers a soft
 * router.refresh() whenever a data-changing event arrives (new lead offer,
 * quote, message, credit change…), so server components on the current page
 * re-fetch and the new state slides in without a full reload.
 *
 * `notification:new` is deliberately NOT handled here — the NotificationBell
 * subscribes to the same channel for that event and shows the toast + bell
 * update itself, so handling it here too would double-refresh.
 */
export function useRealtimeUserEvents(userId: string, _role: Role) {
  const router = useRouter()
  const routerRef = useRef(router)
  useEffect(() => {
    routerRef.current = router
  }, [router])

  // Coalesce bursts — many events in a short window collapse to one refresh.
  const scheduledRef = useRef(false)
  function scheduleRefresh() {
    if (scheduledRef.current) return
    scheduledRef.current = true
    setTimeout(() => {
      scheduledRef.current = false
      routerRef.current.refresh()
    }, 150)
  }

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const channel = supabase.channel(`user:${userId}`, {
      config: { private: true },
    })

    const refresh = () => scheduleRefresh()

    channel
      .on('broadcast', { event: USER_EVENTS.LEAD_NEW }, refresh)
      .on('broadcast', { event: USER_EVENTS.LEAD_UPDATED }, refresh)
      .on('broadcast', { event: USER_EVENTS.QUOTE_NEW }, refresh)
      .on('broadcast', { event: USER_EVENTS.QUOTE_ACCEPTED }, refresh)
      // The inbox rail patches chat messages in place; only refresh the sidebar
      // unread badge for messages from OTHERS (the sender's own send changes no
      // count). `mine` is set on the sender's own copy.
      .on('broadcast', { event: USER_EVENTS.MESSAGE_NEW }, (msg) => {
        if ((msg.payload as { mine?: boolean } | undefined)?.mine) return
        refresh()
      })
      .on('broadcast', { event: USER_EVENTS.CREDITS_CHANGED }, refresh)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('[realtime-user-events] status', { userId, status })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])
}
