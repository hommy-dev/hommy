'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { chatChannelName } from '@/lib/chat/channels'

type PresencePayload = {
  userId: string
  typing: boolean
  typingAt?: number
}

type PresenceState = {
  othersOnline: string[] // user ids present in the channel other than me
  typingUserIds: string[] // user ids currently typing (typingAt within last 3s)
}

const TYPING_TTL_MS = 3000
const TYPING_BROADCAST_DEBOUNCE_MS = 1500

/**
 * Presence + typing indicators for a single conversation.
 *
 * Layered on the existing `chat:{conversationId}` private channel using
 * Supabase Realtime Presence. No extra RLS work — the same `chat_topic_read`
 * policy allows `extension IN ('broadcast','presence')` so members can
 * already both send message broadcasts AND track presence on this topic.
 *
 * Returns:
 *   • `othersOnline` — user ids currently subscribed to the channel
 *     (other than me). Drives the green dot / "online now" label.
 *   • `typingUserIds` — user ids whose most recent `typingAt` heartbeat
 *     is within TYPING_TTL_MS. Drives the "typing…" indicator.
 *   • `emitTyping()` — call from the composer on keypress. Debounced so
 *     we don't spam the channel.
 */
export function useChatPresence(
  conversationId: string,
  currentUserId: string,
) {
  const [state, setState] = useState<PresenceState>({
    othersOnline: [],
    typingUserIds: [],
  })
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>['channel']
  > | null>(null)
  const lastEmitRef = useRef(0)
  const myTypingAtRef = useRef(0)

  useEffect(() => {
    if (!conversationId || !currentUserId) return
    const supabase = createClient()
    const topic = chatChannelName(conversationId)
    const channel = supabase.channel(topic, {
      config: {
        private: true,
        // Each client's presence row is keyed by user id so re-subscribes
        // (e.g. flaky connection) don't create dupes.
        presence: { key: currentUserId },
      },
    })
    channelRef.current = channel

    const recompute = () => {
      const raw = channel.presenceState() as Record<string, PresencePayload[]>
      const othersOnline: string[] = []
      const typing: string[] = []
      const now = Date.now()
      for (const [userId, rows] of Object.entries(raw)) {
        if (userId === currentUserId) continue
        if (!rows?.length) continue
        othersOnline.push(userId)
        const newestTyping = rows.reduce(
          (max, r) => (r.typing && (r.typingAt ?? 0) > max ? r.typingAt ?? 0 : max),
          0,
        )
        if (newestTyping > 0 && now - newestTyping < TYPING_TTL_MS) {
          typing.push(userId)
        }
      }
      setState({ othersOnline, typingUserIds: typing })
    }

    channel
      .on('presence', { event: 'sync' }, recompute)
      .on('presence', { event: 'join' }, recompute)
      .on('presence', { event: 'leave' }, recompute)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: currentUserId,
            typing: false,
          } satisfies PresencePayload)
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          console.warn('[chat-presence] subscribe status', {
            conversationId,
            status,
          })
        }
      })

    // Stale-typing expiry: re-evaluate every second so the indicator
    // clears after TYPING_TTL_MS even if no new events arrive.
    const tick = setInterval(recompute, 1000)

    return () => {
      clearInterval(tick)
      void channel.untrack()
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [conversationId, currentUserId])

  /**
   * Emit a typing=true heartbeat. Debounced to once per 1.5s so we aren't
   * spamming presence updates on every keystroke.
   */
  const emitTyping = useCallback(() => {
    const ch = channelRef.current
    if (!ch) return
    const now = Date.now()
    if (now - lastEmitRef.current < TYPING_BROADCAST_DEBOUNCE_MS) return
    lastEmitRef.current = now
    myTypingAtRef.current = now
    void ch.track({
      userId: currentUserId,
      typing: true,
      typingAt: now,
    } satisfies PresencePayload)
  }, [currentUserId])

  /**
   * Immediately clear our own typing state. Called when we send a message
   * so the "typing…" indicator disappears on the other side right away.
   */
  const clearTyping = useCallback(() => {
    const ch = channelRef.current
    if (!ch) return
    lastEmitRef.current = 0
    myTypingAtRef.current = 0
    void ch.track({
      userId: currentUserId,
      typing: false,
    } satisfies PresencePayload)
  }, [currentUserId])

  return {
    ...state,
    emitTyping,
    clearTyping,
  }
}
