'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import type { ParticipantIdentity } from '@/lib/data/conversations'
import { sendMessage, markConversationRead } from '@/lib/actions/messages'
import { showToast } from '@/components/ui/toast'
import { MessageBubble, DayDivider, type DisplayMessage } from './message-bubble'
import { MessageComposer } from './message-composer'
import { useConversationStream } from './use-conversation-stream'

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

/**
 * A single conversation thread: live `chat:{id}` subscription, optimistic send,
 * debounced mark-read. Owns the message list locally so a parent re-render
 * (router.refresh from the inbox channel) never disrupts an open thread.
 */
export function MessageThread({
  conversationId,
  me,
  initialMessages,
  otherName,
}: {
  conversationId: string
  me: ParticipantIdentity
  initialMessages: DisplayMessage[]
  otherName?: string
}) {
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages)
  const tempCounter = useRef(0)
  const endRef = useRef<HTMLDivElement>(null)
  const markReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleMarkRead = useCallback(() => {
    if (markReadTimer.current) clearTimeout(markReadTimer.current)
    markReadTimer.current = setTimeout(() => {
      void markConversationRead(conversationId).catch(() => {})
    }, 800)
  }, [conversationId])

  // Mark read on open + clean up the timer on unmount.
  useEffect(() => {
    scheduleMarkRead()
    return () => {
      if (markReadTimer.current) clearTimeout(markReadTimer.current)
    }
  }, [scheduleMarkRead])

  // Keep pinned to the newest message.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  // Incoming live messages. The broadcast payload carries the SENDER's `isMine`,
  // so we recompute it from this viewer's identity.
  useConversationStream(conversationId, (incoming) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev
      const mine = incoming.senderType === me.type && incoming.senderId === me.id
      return [...prev, { ...incoming, isMine: mine }]
    })
    if (!(incoming.senderType === me.type && incoming.senderId === me.id)) scheduleMarkRead()
  })

  const handleSend = useCallback(
    (body: string) => {
      const tempId = `temp-${tempCounter.current++}`
      const optimistic: DisplayMessage = {
        id: tempId,
        senderType: me.type,
        senderId: me.id,
        body,
        meta: null,
        createdAt: new Date().toISOString(),
        isMine: true,
        pending: true,
      }
      setMessages((prev) => [...prev, optimistic])

      void (async () => {
        const res = await sendMessage(conversationId, body)
        if (res.ok) {
          const real = res.message
          setMessages((prev) => {
            const withoutTemp = prev.filter((m) => m.id !== tempId)
            return withoutTemp.some((m) => m.id === real.id)
              ? withoutTemp
              : [...withoutTemp, { ...real, isMine: true }]
          })
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
          )
          showToast(res.message, { type: 'error' })
        }
      })()
    },
    [conversationId, me.type, me.id],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-2 lg:space-y-[0.556vw] overflow-y-auto px-4 lg:px-[1.111vw] py-4 lg:py-[1.111vw]">
        {messages.length === 0 ? (
          <p className="py-10 lg:py-[2.778vw] text-center text-sm lg:text-[0.972vw] text-muted-foreground">
            No messages yet. Say hello.
          </p>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1]
            const showDay = !prev || !sameDay(prev.createdAt, m.createdAt)
            return (
              <Fragment key={m.id}>
                {showDay ? <DayDivider iso={m.createdAt} /> : null}
                <MessageBubble message={m} viewerType={me.type} otherName={otherName} />
              </Fragment>
            )
          })
        )}
        <div ref={endRef} />
      </div>
      <MessageComposer onSend={handleSend} />
    </div>
  )
}
