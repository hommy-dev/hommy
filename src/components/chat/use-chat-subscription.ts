'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { chatChannelName } from '@/lib/chat/channels'

type Payload = Record<string, unknown>

export type ChatChannelEvent =
  | 'message:new'
  | 'message:deleted'
  | 'message:edited'

/**
 * Subscribe to a private chat channel for a single conversation.
 *
 * • Uses `config: { private: true }` so Supabase Realtime enforces the RLS
 *   policy on `realtime.messages` — members-only, validated per JWT.
 * • Invokes `onEvent(event, payload)` for every broadcast event
 *   (`message:new`, `message:deleted`).
 * • Handles cleanup — channel is removed on unmount or id change.
 *
 * The callback is stored in a ref so changing its identity on every
 * render doesn't cause the channel to resubscribe.
 */
export function useChatSubscription(
  conversationId: string,
  onEvent: (event: ChatChannelEvent, payload: Payload) => void,
) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!conversationId) return

    const supabase = createClient()
    const topic = chatChannelName(conversationId)
    const channel = supabase.channel(topic, {
      config: { private: true },
    })

    const forward = (event: ChatChannelEvent) => (raw: { payload?: Payload }) => {
      const payload = raw?.payload
      if (payload) onEventRef.current(event, payload)
    }

    channel
      .on('broadcast', { event: 'message:new' }, forward('message:new'))
      .on('broadcast', { event: 'message:deleted' }, forward('message:deleted'))
      .on('broadcast', { event: 'message:edited' }, forward('message:edited'))
      .subscribe((status) => {
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          console.warn('[chat] subscribe status', { conversationId, status })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])
}
