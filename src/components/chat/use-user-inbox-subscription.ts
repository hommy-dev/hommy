'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { applyBumped, hydrateConversations } from './chat-store'
import { resyncConversationsAction } from '@/lib/actions/chat-sync'

/**
 * Subscribe to `user:{userId}` — the per-user "inbox" broadcast channel.
 *
 * The channel receives:
 *   • `conversation:bumped` — fired by the server-side SQL CTE every time
 *     any message is sent in any of my conversations. Payload:
 *       { conversationId, preview, senderId, at }
 *
 * Membership and privacy are enforced by the `user_inbox_read` RLS policy
 * on `realtime.messages` — only the user whose id matches the topic suffix
 * can subscribe.
 *
 * Reconnect safety:
 *   If the channel status flips to CLOSED / TIMED_OUT and then back to
 *   SUBSCRIBED, we resync the entire conversation list from the server.
 *   Any bumps that happened during the outage are replayed from the
 *   denormalized columns. This is the "catch up after network blip"
 *   safety net — cheap (one indexed query) and correct.
 *
 * One per connected client, mounted at the dashboard layout level so the
 * main sidebar nav badge stays live across the entire app (not just the
 * chat page).
 */
export function useUserInboxSubscription(userId: string | null | undefined) {
  // Track the last non-SUBSCRIBED status so we only resync when we're
  // *recovering* from a drop — not on the initial SUBSCRIBED event.
  const hadDropRef = useRef(false)

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const topic = `user:${userId}`
    const channel = supabase.channel(topic, { config: { private: true } })

    channel
      .on('broadcast', { event: 'conversation:bumped' }, (raw) => {
        const payload = (raw as { payload?: Record<string, unknown> })?.payload
        if (!payload) return
        const conversationId = String(payload.conversationId ?? '')
        const preview = String(payload.preview ?? '')
        const senderId = String(payload.senderId ?? '')
        const at = String(payload.at ?? new Date().toISOString())
        if (!conversationId) return
        applyBumped({ conversationId, preview, senderId, at })
      })
      .subscribe(async (status) => {
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          hadDropRef.current = true
          console.warn('[inbox] subscribe status', { userId, status })
          return
        }
        if (status === 'SUBSCRIBED' && hadDropRef.current) {
          hadDropRef.current = false
          // Recover any missed bumps by resyncing from the DB.
          try {
            const res = await resyncConversationsAction()
            if (res.ok) {
              hydrateConversations(userId, res.conversations)
            }
          } catch (err) {
            console.warn('[inbox] resync failed', err)
          }
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])
}
