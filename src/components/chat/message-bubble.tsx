'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Clock,
  Copy,
  CornerUpLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { showToast } from '@/components/ui/toast'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { ChatMessage } from './use-chat-messages'
import { ImageAttachment } from './attachments/image-attachment'
import { FileAttachment } from './attachments/file-attachment'
import { VoicePlayer } from './attachments/voice-player'
import { VideoAttachment } from './attachments/video-attachment'

type SenderDisplay = {
  userId: string
  name: string
  avatarUrl: string | null
}

type Props = {
  message: ChatMessage
  mine: boolean
  grouped: boolean
  sender: SenderDisplay
  /** Display info for every participant in the thread. Used to render the
   *  parent's sender name in the reply quote card. */
  senders: Record<string, SenderDisplay>
  /** Look up a currently-loaded message by id. If the parent is in the
   *  active window we prefer its live state (reflects soft-deletes and
   *  edits immediately); otherwise we fall back to the reply card snapshot. */
  getLiveMessage?: (id: string) => ChatMessage | undefined
  highlighted?: boolean
  onDelete?: (messageId: string) => Promise<{ ok: boolean; message?: string } | void>
  onEdit?: (
    messageId: string,
    newContent: string,
  ) => Promise<{ ok: boolean; message?: string } | void>
  onReply?: (message: ChatMessage) => void
  onJumpToMessage?: (messageId: string) => void
}

/**
 * Side-aligned message row. Own messages flow from the right with a
 * primary-tinted bubble; others from the left with a muted bubble.
 *
 *   Other:  [avatar]  Name  timestamp
 *                     ┌─ bubble ───────┐
 *                     │ body           │
 *                     └────────────────┘
 *
 *   Mine:                       timestamp  Name  [avatar]
 *                   ┌─ bubble ─────────────────┐
 *                   │ body                     │
 *                   └──────────────────────────┘
 *
 * Grouping: same sender within 5 minutes shows only the body (no avatar
 * header), aligned under the first message's bubble.
 *
 * Hover actions: the ⋯ menu floats on the OUTSIDE of the bubble so it
 * doesn't overlap content. One-click delete — no confirmation.
 */
export function MessageBubble({
  message,
  mine,
  grouped,
  sender,
  senders,
  getLiveMessage,
  highlighted,
  onDelete,
  onEdit,
  onReply,
  onJumpToMessage,
}: Props) {
  const isDeleted = Boolean(message.deletedAt)
  const isPending = Boolean(message.local)
  const [editing, setEditing] = useState(false)

  const hasText = message.content.length > 0

  return (
    <div
      data-message-id={message.id}
      className={cn(
        'group relative flex w-full gap-2 lg:gap-[0.556vw] px-4 lg:px-[1.111vw] transition-colors',
        grouped ? 'mt-0.5 lg:mt-[0.139vw]' : 'mt-4 lg:mt-[1.111vw]',
        mine ? 'flex-row-reverse' : 'flex-row',
        highlighted && 'bg-primary/10',
      )}
    >
      {/*
        Avatar column — hidden for now. Side-aligned bubbles already
        distinguish sender from receiver, so the avatar + name + timestamp
        header is redundant. Kept commented so we can reinstate when a
        group / multi-member conversation UI lands.

      <div className="w-10 lg:w-[2.778vw] shrink-0">
        {grouped ? (
          <span
            className={cn(
              'mt-2 lg:mt-[0.556vw] hidden select-none text-[10px] lg:text-[0.694vw] tabular-nums text-muted-foreground group-hover:inline',
              mine ? 'text-right pr-1 lg:pr-[0.278vw]' : 'pl-1 lg:pl-[0.278vw]',
            )}
            aria-hidden
          >
            {formatHoverTime(message.createdAt)}
          </span>
        ) : (
          <Avatar size="default" className="size-10 lg:size-[2.778vw]">
            {sender.avatarUrl ? (
              <AvatarImage src={sender.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-xs lg:text-[0.833vw]">
              {getInitials(sender.name)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      */}

      <div
        className={cn(
          'flex min-w-0 max-w-[75%] flex-col',
          mine ? 'items-end' : 'items-start',
        )}
      >
        {/*
          Name + timestamp header — hidden for now; bubbles already
          communicate the sender via side alignment, so this line adds
          visual noise. Re-enable when we surface multi-party threads.

        {!grouped ? (
          <div
            className={cn(
              'mb-0.5 lg:mb-[0.139vw] flex items-baseline gap-2 lg:gap-[0.556vw] px-1 lg:px-[0.278vw] text-[11px] lg:text-[0.764vw]',
              mine && 'flex-row-reverse',
            )}
          >
            <span className="truncate font-semibold text-foreground">
              {sender.name || 'User'}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {formatDiscordTimestamp(message.createdAt)}
            </span>
          </div>
        ) : null}
        */}

        {/* Reply quote card — only when this message is itself a reply AND
            the parent still exists (FK is ON DELETE SET NULL, so a hard
            purge nulls parentMessageId; a soft delete keeps it and we
            render "Original message deleted" via isDeleted). */}
        {message.parentPreview && !isDeleted ? (
          <ParentQuote
            mine={mine}
            preview={message.parentPreview}
            senders={senders}
            getLiveMessage={getLiveMessage}
            onJumpToMessage={onJumpToMessage}
          />
        ) : null}

        {isDeleted ? (
          <Bubble mine={mine} muted>
            <span className="italic text-muted-foreground">Message deleted</span>
          </Bubble>
        ) : editing ? (
          <InlineEditor
            initialContent={message.content}
            onCancel={() => setEditing(false)}
            onSave={async (newContent) => {
              if (newContent === message.content) {
                setEditing(false)
                return
              }
              if (!onEdit) return
              const res = await onEdit(message.id, newContent)
              if (res && res.ok === false) {
                showToast(res.message ?? 'Could not edit.', { type: 'error' })
                return
              }
              setEditing(false)
            }}
          />
        ) : (
          <>
            {hasText ? (
              <Bubble
                mine={mine}
                pending={message.local === 'pending'}
                failed={message.local === 'failed'}
              >
                <span className="whitespace-pre-wrap break-words">
                  {message.content}
                </span>
                {message.editedAt && !message.local ? (
                  <span
                    className={cn(
                      'ml-1 lg:ml-[0.278vw] select-none text-[10px] lg:text-[0.694vw]',
                      mine ? 'text-primary-foreground/60' : 'text-muted-foreground',
                    )}
                    title={`Edited ${new Date(message.editedAt).toLocaleString()}`}
                  >
                    (edited)
                  </span>
                ) : null}
              </Bubble>
            ) : null}

            {message.attachments.length > 0 ? (
              <div
                className={cn(
                  'flex flex-col gap-1.5 lg:gap-[0.417vw]',
                  hasText ? 'mt-1 lg:mt-[0.278vw]' : '',
                  mine ? 'items-end' : 'items-start',
                )}
              >
                {message.attachments.map((att) => (
                  <AttachmentSlot key={att.id} att={att} mine={mine} />
                ))}
              </div>
            ) : null}

            {message.local || (mine && message.isFlagged) ? (
              <div
                className={cn(
                  'mt-1 lg:mt-[0.278vw] flex items-center gap-1 lg:gap-[0.278vw] px-1 lg:px-[0.278vw] text-[10px] lg:text-[0.694vw] text-muted-foreground',
                  mine && 'flex-row-reverse',
                )}
              >
                {message.local === 'pending' ? (
                  <>
                    <Clock className="size-3 lg:size-[0.833vw]" />
                    <span>Sending…</span>
                  </>
                ) : message.local === 'failed' ? (
                  <>
                    <AlertCircle className="size-3 lg:size-[0.833vw] text-destructive" />
                    <span className="text-destructive">Failed to send</span>
                  </>
                ) : null}
                {mine && message.isFlagged ? (
                  <span
                    className="inline-flex items-center gap-0.5 lg:gap-[0.139vw] text-amber-600 dark:text-amber-400"
                    title="Flagged by moderation — visible to admin review"
                  >
                    <AlertCircle className="size-3 lg:size-[0.833vw]" />
                    Flagged
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Hover toolbar anchored on the OPPOSITE edge of the bubble so it
          never overlaps text. */}
      {!isDeleted && !isPending && !editing ? (
        <HoverToolbar
          message={message}
          mine={mine}
          canEdit={Boolean(mine && onEdit && hasText)}
          canDelete={Boolean(mine && onDelete)}
          canReply={Boolean(onReply)}
          onStartEdit={() => setEditing(true)}
          onDelete={onDelete}
          onReply={onReply}
        />
      ) : null}
    </div>
  )
}

function Bubble({
  mine,
  muted,
  pending,
  failed,
  children,
}: {
  mine: boolean
  muted?: boolean
  pending?: boolean
  failed?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'inline-block max-w-full rounded-2xl lg:rounded-[1.111vw] px-3.5 lg:px-[0.972vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw] leading-relaxed shadow-2xs',
        mine
          ? 'rounded-br-md lg:rounded-br-[0.556vw] bg-primary text-primary-foreground'
          : 'rounded-bl-md lg:rounded-bl-[0.556vw] border border-border bg-background text-foreground',
        muted && 'bg-muted text-muted-foreground border-transparent',
        pending && 'opacity-70',
        failed && 'ring-1 ring-destructive',
      )}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------

function HoverToolbar({
  message,
  mine,
  canEdit,
  canDelete,
  canReply,
  onStartEdit,
  onDelete,
  onReply,
}: {
  message: ChatMessage
  mine: boolean
  canEdit: boolean
  canDelete: boolean
  canReply: boolean
  onStartEdit: () => void
  onDelete?: (messageId: string) => Promise<{ ok: boolean; message?: string } | void>
  onReply?: (message: ChatMessage) => void
}) {
  const [open, setOpen] = useState(false)
  const hasCopy = message.content.length > 0
  const anyAction = canReply || hasCopy || canEdit || canDelete
  if (!anyAction) return null

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      showToast('Copied to clipboard', { type: 'info' })
    } catch {
      showToast('Could not copy', { type: 'error' })
    }
  }

  const doDelete = async () => {
    if (!onDelete) return
    setOpen(false)
    await onDelete(message.id)
  }

  const doReply = () => {
    if (!onReply) return
    setOpen(false)
    onReply(message)
  }

  return (
    <div
      className={cn(
        'absolute top-0 z-10',
        mine ? 'left-2 lg:left-[0.556vw]' : 'right-2 lg:right-[0.556vw]',
        open ? 'flex' : 'hidden group-hover:flex',
      )}
    >
      <div className="flex items-center rounded-md lg:rounded-[0.556vw] border border-border bg-popover shadow-md">
        {canReply ? (
          <button
            type="button"
            onClick={doReply}
            aria-label="Reply"
            className="inline-flex size-7 lg:size-[1.944vw] items-center justify-center rounded-md lg:rounded-[0.556vw] text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CornerUpLeft className="size-4 lg:size-[1.111vw]" />
          </button>
        ) : null}
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            className="inline-flex size-7 lg:size-[1.944vw] items-center justify-center rounded-md lg:rounded-[0.556vw] text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="More actions"
          >
            <MoreHorizontal className="size-4 lg:size-[1.111vw]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align={mine ? 'start' : 'end'} className="w-48 lg:w-[13.333vw]">
            {canReply ? (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  doReply()
                }}
              >
                <CornerUpLeft className="size-4 lg:size-[1.111vw]" />
                <span>Reply</span>
              </DropdownMenuItem>
            ) : null}
            {hasCopy ? (
              <DropdownMenuItem onSelect={() => void doCopy()}>
                <Copy className="size-4 lg:size-[1.111vw]" />
                <span>Copy Text</span>
              </DropdownMenuItem>
            ) : null}
            {canEdit ? (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setOpen(false)
                  onStartEdit()
                }}
              >
                <Pencil className="size-4 lg:size-[1.111vw]" />
                <span>Edit Message</span>
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <>
                {hasCopy || canEdit ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    void doDelete()
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4 lg:size-[1.111vw]" />
                  <span>Delete Message</span>
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------

/**
 * The reply-card rendered above a message body when it's a reply.
 * Minimal — one line of preview, sender name, click to jump. Matches the
 * Discord / WhatsApp shape.
 *
 * Lookup strategy: if the parent is in the currently-loaded window we
 * prefer its live state (so a subsequent soft-delete flips this to
 * "Original message deleted" immediately via realtime). Otherwise fall
 * back to the server-side snapshot baked into parentPreview.
 */
function ParentQuote({
  mine,
  preview,
  senders,
  getLiveMessage,
  onJumpToMessage,
}: {
  mine: boolean
  preview: NonNullable<ChatMessage['parentPreview']>
  senders: Record<string, SenderDisplay>
  getLiveMessage?: (id: string) => ChatMessage | undefined
  onJumpToMessage?: (id: string) => void
}) {
  const live = getLiveMessage ? getLiveMessage(preview.id) : undefined
  const parentSender = senders[preview.senderId]
  const senderName = parentSender?.name || 'User'
  const isDeleted = live ? Boolean(live.deletedAt) : preview.isDeleted
  const content = live ? live.content : preview.content
  const firstAttKind = live
    ? (live.attachments[0]?.kind ?? null)
    : preview.firstAttachmentKind
  const displayBody = isDeleted
    ? 'Original message deleted'
    : content
      ? content
      : firstAttKind === 'IMAGE'
        ? '📷 Photo'
        : firstAttKind === 'VIDEO'
          ? '🎥 Video'
          : firstAttKind === 'AUDIO'
            ? '🎤 Voice message'
            : firstAttKind === 'FILE'
              ? '📎 File'
              : '—'

  const handleClick = () => {
    if (onJumpToMessage) onJumpToMessage(preview.id)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Jump to message from ${senderName}`}
      className={cn(
        'mb-1 lg:mb-[0.278vw] flex max-w-full items-center gap-1.5 lg:gap-[0.417vw] rounded-md lg:rounded-[0.556vw] border-l-2 bg-muted/40 px-2 lg:px-[0.556vw] py-1 lg:py-[0.278vw] text-left text-[12px] lg:text-[0.833vw] text-muted-foreground transition-colors hover:bg-muted',
        mine ? 'border-primary' : 'border-border',
      )}
    >
      <CornerUpLeft className="size-3 lg:size-[0.833vw] shrink-0 text-muted-foreground/70" />
      <span className="shrink-0 font-semibold text-foreground">
        {senderName}
      </span>
      <span
        className={cn(
          'min-w-0 truncate',
          isDeleted && 'italic',
        )}
      >
        {displayBody}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------

function InlineEditor({
  initialContent,
  onCancel,
  onSave,
}: {
  initialContent: string
  onCancel: () => void
  onSave: (next: string) => Promise<void>
}) {
  const [value, setValue] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  const trimmed = value.trim()
  const canSave = trimmed.length > 0 && trimmed.length <= 2000 && !saving

  const submit = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave(trimmed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void submit()
          }
        }}
        rows={1}
        maxLength={2000}
        disabled={saving}
        className="max-h-40 lg:max-h-[11.111vw] min-h-10 lg:min-h-[2.778vw] resize-none rounded-2xl lg:rounded-[1.111vw] bg-muted/50 px-3 lg:px-[0.833vw] py-2 lg:py-[0.556vw] text-sm lg:text-[0.972vw]"
      />
      <div className="mt-1 lg:mt-[0.278vw] px-1 lg:px-[0.278vw] text-[11px] lg:text-[0.764vw] text-muted-foreground">
        escape to{' '}
        <button
          type="button"
          onClick={onCancel}
          className="text-primary hover:underline"
        >
          cancel
        </button>{' '}
        · enter to{' '}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSave}
          className="text-primary hover:underline disabled:opacity-50"
        >
          save
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------

function AttachmentSlot({
  att,
  mine,
}: {
  att: ChatMessage['attachments'][number]
  mine: boolean
}) {
  if (att.kind === 'IMAGE') return <ImageAttachment attachment={att} />
  if (att.kind === 'VIDEO') return <VideoAttachment attachment={att} />
  if (att.kind === 'AUDIO') return <VoicePlayer attachment={att} mine={mine} />
  return <FileAttachment attachment={att} />
}

function formatDiscordTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  if (sameDay(d, now)) return `Today at ${time}`
  if (sameDay(d, yesterday)) return `Yesterday at ${time}`
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy} ${time}`
}

function formatHoverTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getInitials(name: string): string {
  const t = (name ?? '').trim()
  if (!t) return '?'
  const parts = t.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
