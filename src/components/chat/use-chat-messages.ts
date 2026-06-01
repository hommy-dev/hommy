'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

export type ChatAttachment = {
  id: string
  messageId: string
  kind: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE'
  storagePath: string                  // Cloudinary public_id
  resourceType: 'image' | 'video' | 'raw'
  mime: string
  sizeBytes: number
  durationMs: number | null
  width: number | null
  height: number | null
  waveformPeaks: number[] | null
  originalFilename: string | null
}

export type ChatMessageParentPreview = {
  id: string
  senderId: string
  content: string
  isDeleted: boolean
  firstAttachmentKind: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE' | null
}

export type ChatMessageKind = 'USER' | 'SYSTEM'

export type ChatMessage = {
  id: string
  conversationId: string
  senderId: string
  /** USER = typed by a human, SYSTEM = emitted by a server action. */
  kind: ChatMessageKind
  /** SYSTEM-only structured payload. UI dispatches per `systemPayload.type`. */
  systemPayload: Record<string, unknown> | null
  content: string
  isFlagged: boolean
  flagReason:
    | 'PHONE_NUMBER'
    | 'EMAIL_ADDRESS'
    | 'EXTERNAL_APP'
    | 'SOCIAL_HANDLE'
    | null
  isRead: boolean
  readAt: string | null
  createdAt: string
  deletedAt: string | null
  editedAt: string | null
  parentMessageId: string | null
  parentPreview: ChatMessageParentPreview | null
  attachments: ChatAttachment[]
  /** `pending` means the optimistic version; `sent` is the confirmed server row. */
  local?: 'pending' | 'failed'
}

/**
 * Local state + invariants for a chat thread:
 *
 * • Store messages sorted ascending by createdAt.
 * • Dedupe on `id` — realtime broadcast and optimistic append both surface
 *   the same message; the second call is a no-op.
 * • Optimistic sends get a temp id and are swapped when the server returns.
 */
export function useChatMessages(initial: ChatMessage[]) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => sortAsc(initial),
  )
  const byIdRef = useRef(new Set(initial.map((m) => m.id)))

  const append = useCallback((msg: ChatMessage) => {
    if (byIdRef.current.has(msg.id)) return
    byIdRef.current.add(msg.id)
    setMessages((prev) => sortAsc([...prev, msg]))
  }, [])

  const prepend = useCallback((older: ChatMessage[]) => {
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id))
      const toAdd = older.filter((m) => !seen.has(m.id))
      if (toAdd.length === 0) return prev
      toAdd.forEach((m) => byIdRef.current.add(m.id))
      return sortAsc([...toAdd, ...prev])
    })
  }, [])

  /**
   * Add a pending optimistic row; returns its temp id for later reconcile.
   */
  const pushPending = useCallback(
    (partial: Omit<ChatMessage, 'id' | 'local'>) => {
      const tempId = `tmp_${Math.random().toString(36).slice(2)}_${Date.now()}`
      const pending: ChatMessage = { ...partial, id: tempId, local: 'pending' }
      byIdRef.current.add(tempId)
      setMessages((prev) => sortAsc([...prev, pending]))
      return tempId
    },
    [],
  )

  /**
   * Replace a pending message with the real row returned from the server.
   */
  const confirmPending = useCallback(
    (tempId: string, real: ChatMessage) => {
      byIdRef.current.delete(tempId)
      byIdRef.current.add(real.id)
      setMessages((prev) =>
        sortAsc(prev.filter((m) => m.id !== tempId).concat(real)),
      )
    },
    [],
  )

  const failPending = useCallback((tempId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, local: 'failed' as const } : m)),
    )
  }, [])

  /**
   * Mark a message as deleted in-place (soft delete). Row stays in the
   * list and renders as "Message deleted" placeholder.
   */
  const markDeleted = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, deletedAt: m.deletedAt ?? new Date().toISOString() }
          : m,
      ),
    )
  }, [])

  /**
   * Apply an edit (content change + editedAt cursor) to a message.
   * Broadcast-driven: chat:{id} message:edited payload arrives on
   * every subscriber and this is how each reconciles.
   */
  const applyEdit = useCallback(
    (
      messageId: string,
      patch: {
        content: string
        editedAt: string
        isFlagged?: boolean
        flagReason?: ChatMessage['flagReason']
      },
    ) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: patch.content,
                editedAt: patch.editedAt,
                isFlagged: patch.isFlagged ?? m.isFlagged,
                flagReason: patch.flagReason ?? m.flagReason,
              }
            : m,
        ),
      )
    },
    [],
  )

  const value = useMemo(
    () => ({
      messages,
      append,
      prepend,
      pushPending,
      confirmPending,
      failPending,
      markDeleted,
      applyEdit,
    }),
    [
      messages,
      append,
      prepend,
      pushPending,
      confirmPending,
      failPending,
      markDeleted,
      applyEdit,
    ],
  )

  return value
}

function sortAsc(list: ChatMessage[]): ChatMessage[] {
  return list
    .slice()
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
}
