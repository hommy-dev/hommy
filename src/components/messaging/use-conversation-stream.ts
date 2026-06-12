'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ThreadMessage } from '@/lib/data/conversations'

/**
 * Subscribe to a conversation's live stream (`chat:{id}` private channel,
 * authorized by the `is_conversation_participant` RLS policy). Calls `onMessage`
 * with each incoming message payload. One subscription per mounted thread.
 */
export function useConversationStream(
  conversationId: string,
  onMessage: (message: ThreadMessage) => void,
) {
  const cbRef = useRef(onMessage)
  useEffect(() => {
    cbRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!conversationId) return
    const supabase = createClient()
    const channel = supabase.channel(`chat:${conversationId}`, { config: { private: true } })

    channel
      .on('broadcast', { event: 'message:new' }, (msg) => {
        const payload = msg.payload as ThreadMessage | undefined
        if (payload?.id) cbRef.current(payload)
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('[conversation-stream] status', { conversationId, status })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])
}
