'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setOnlineUserIds } from './presence-store'
import { heartbeatAction } from '@/lib/actions/presence'

type TrackPayload = {
  userId: string
  role: 'HOMEOWNER' | 'CONTRACTOR' | 'ADMIN'
}

const HEARTBEAT_INTERVAL_MS = 60_000

/**
 * Platform-wide presence — subscribes the current client to the global
 * `presence:platform` Supabase Realtime channel, tracks itself there,
 * and streams sync/join/leave events into the `presenceStore`.
 *
 * Key behaviors:
 *   • Tab de-dupe: Supabase Presence keys by `presence.key = userId`,
 *     so 5 tabs for the same user count as ONE presence entry — closing
 *     4 tabs doesn't flip them offline.
 *   • Reconnect safety: on SUBSCRIBED after a CLOSED/TIMED_OUT, we
 *     re-track ourselves (Supabase clears presence on disconnect).
 *   • Heartbeat: `users.last_seen_at` written every 60s BUT ONLY while
 *     the tab is visible. Background tabs don't count — prevents
 *     trivial "always online" gaming AND keeps DB write volume sane.
 *   • On visibilitychange → visible: heartbeat fires immediately so
 *     the "last seen" label is never stale when the user comes back.
 *
 * TODO (SCALE): when concurrent users exceed ~1k, migrate the channel
 * layout from one global `presence:platform` to sharded
 * `presence:shard:{hash(userId) % N}` plus a per-user lookup protocol.
 * The store's `useIsUserOnline(userId)` API stays unchanged; this hook
 * is the only file that needs updating.
 */
export function usePlatformPresence(
  currentUserId: string | null | undefined,
  role: TrackPayload['role'],
) {
  const hadDropRef = useRef(false)

  useEffect(() => {
    if (!currentUserId) return

    const supabase = createClient()
    const channel = supabase.channel('presence:platform', {
      config: {
        // Keying by userId collapses all tabs/devices for one user into
        // one presence entry — the core multi-tab invariant.
        presence: { key: currentUserId },
      },
    })

    const reconcile = () => {
      const raw = channel.presenceState() as Record<string, TrackPayload[]>
      // Object keys are the presence keys (userIds); since we key by
      // userId, the keyset IS the set of online user ids.
      setOnlineUserIds(Object.keys(raw))
    }

    channel
      .on('presence', { event: 'sync' }, reconcile)
      .on('presence', { event: 'join' }, reconcile)
      .on('presence', { event: 'leave' }, reconcile)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: currentUserId,
            role,
          } satisfies TrackPayload)
          // First heartbeat on subscribe so the `last_seen_at` cursor
          // gets an immediate bump (beats waiting 60s for the interval).
          void heartbeatAction()
          if (hadDropRef.current) {
            hadDropRef.current = false
          }
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          hadDropRef.current = true
          console.warn('[presence] subscribe status', { status })
        }
      })

    // Heartbeat loop — visibility-gated.
    const isVisible = () =>
      typeof document === 'undefined' ||
      document.visibilityState === 'visible'

    const heartbeat = () => {
      if (!isVisible()) return
      void heartbeatAction()
    }

    const interval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS)

    const onVis = () => {
      if (isVisible()) {
        // Coming back from background — bump last_seen immediately.
        heartbeat()
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVis)
    }

    return () => {
      clearInterval(interval)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVis)
      }
      void channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [currentUserId, role])
}
