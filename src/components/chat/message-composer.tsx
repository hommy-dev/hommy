'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CornerUpLeft,
  FileText,
  Image as ImageIcon,
  Mic,
  Plus,
  SendHorizonal,
  Video as VideoIcon,
  X,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { showToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  uploadChatAttachment,
  type ChatAttachmentKind,
  type ChatUploadProgress,
} from '@/lib/cloudinary/chat-upload'
import type { AttachmentInput } from '@/lib/actions/chat'
import { VoiceRecorder } from './attachments/voice-recorder'

export type ComposerReplyTarget = {
  id: string
  senderName: string
  /** Short description of the parent — text preview or attachment summary. */
  preview: string
}

type Props = {
  conversationId: string
  disabled?: boolean
  placeholder?: string
  onSend: (
    content: string,
    attachments?: AttachmentInput[],
  ) => Promise<{
    ok: boolean
    flagged?: boolean
    message?: string
  }>
  onType?: () => void
  footerHint?: React.ReactNode
  /** When set, composer renders a "Replying to X" banner above the textarea.
   *  The parentMessageId is managed by the parent — it's woven into onSend
   *  via closure, so the composer only needs display metadata. */
  replyingTo?: ComposerReplyTarget | null
  onCancelReply?: () => void
}

const MAX = 2000
const MAX_IMAGE_MB = 10
const MAX_FILE_MB = 25
const MAX_VIDEO_MB = 100

type PendingUpload = {
  id: string
  name: string
  kind: ChatAttachmentKind
  progress: number
  /** Local blob URL for instant preview (images + videos). */
  previewUrl?: string
  /** File size in bytes — used in file-chip display. */
  size: number
  attachment?: AttachmentInput
  error?: string
  abort?: AbortController
}

export function MessageComposer({
  conversationId,
  disabled,
  placeholder = 'Write a message…',
  onSend,
  onType,
  footerHint,
  replyingTo,
  onCancelReply,
}: Props) {
  const [value, setValue] = useState('')
  const [plusOpen, setPlusOpen] = useState(false)
  const [uploads, setUploads] = useState<PendingUpload[]>([])
  const [recording, setRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Auto-focus textarea when a new reply target arrives — Discord/WhatsApp
  // pattern: clicking Reply immediately drops you into the input.
  useEffect(() => {
    if (replyingTo) textareaRef.current?.focus()
  }, [replyingTo?.id])

  // Escape cancels reply (when textarea empty; otherwise escape stays
  // available for clearing text via browser default).
  useEffect(() => {
    if (!replyingTo || !onCancelReply) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && value.length === 0) {
        onCancelReply()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [replyingTo, onCancelReply, value.length])

  const trimmed = value.trim()
  const readyAttachments = uploads
    .filter((u) => u.attachment && !u.error)
    .map((u) => u.attachment!) as AttachmentInput[]
  const uploadsInFlight = uploads.some((u) => !u.attachment && !u.error)
  const canSend =
    !disabled &&
    !recording &&
    !uploadsInFlight &&
    (trimmed.length > 0 || readyAttachments.length > 0) &&
    trimmed.length <= MAX

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    if (!canSend) return
    const content = trimmed
    const atts = readyAttachments
    setValue('')
    // Revoke any local preview blob URLs — we're done with them now
    // that the attachment will render from Cloudinary.
    for (const u of uploads) {
      if (u.previewUrl) URL.revokeObjectURL(u.previewUrl)
    }
    setUploads([])
    textareaRef.current?.focus()
    void (async () => {
      try {
        const res = await onSend(content, atts)
        if (!res.ok) {
          // Restore text if send failed — attachments can't be safely
          // restored (URLs were already uploaded, but user may want to retry).
          setValue((current) => (current ? current : content))
          showToast(res.message ?? 'Could not send.', { type: 'error' })
          return
        }
        if (res.flagged) {
          showToast(
            'Keep conversations on-platform — that message looked like it contained contact info.',
            { type: 'info', duration: 6000 },
          )
        }
      } catch (err) {
        console.error('[Chat] composer send error', err)
        setValue((current) => (current ? current : content))
        showToast('Could not send. Check your connection.', { type: 'error' })
      }
    })()
  }

  const openImagePicker = () => {
    setPlusOpen(false)
    imageInputRef.current?.click()
  }
  const openVideoPicker = () => {
    setPlusOpen(false)
    videoInputRef.current?.click()
  }
  const openFilePicker = () => {
    setPlusOpen(false)
    fileInputRef.current?.click()
  }

  const startVoice = () => {
    setPlusOpen(false)
    setRecording(true)
  }

  const handleFiles = useCallback(
    async (files: FileList | null, kind: 'IMAGE' | 'VIDEO' | 'FILE') => {
      if (!files || files.length === 0) return
      const maxMb =
        kind === 'IMAGE'
          ? MAX_IMAGE_MB
          : kind === 'VIDEO'
            ? MAX_VIDEO_MB
            : MAX_FILE_MB
      const newUploads: PendingUpload[] = []
      for (const file of Array.from(files)) {
        if (file.size > maxMb * 1024 * 1024) {
          showToast(
            `${file.name} is larger than ${maxMb} MB — please pick a smaller file.`,
            { type: 'error' },
          )
          continue
        }
        // Blob URL for instant local preview. Revoked when the chip is
        // removed or the message is sent.
        const previewUrl =
          kind === 'IMAGE' || kind === 'VIDEO'
            ? URL.createObjectURL(file)
            : undefined
        newUploads.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          kind,
          progress: 0,
          previewUrl,
          size: file.size,
          abort: new AbortController(),
        })
      }
      if (newUploads.length === 0) return
      setUploads((prev) => [...prev, ...newUploads])

      // Upload each in parallel.
      await Promise.all(
        newUploads.map(async (pending, i) => {
          const file = files[i]
          try {
            const res = await uploadChatAttachment(file, {
              conversationId,
              kind,
              signal: pending.abort?.signal,
              onProgress: (p: ChatUploadProgress) => {
                setUploads((prev) =>
                  prev.map((u) =>
                    u.id === pending.id ? { ...u, progress: p.percent } : u,
                  ),
                )
              },
            })
            const attachment: AttachmentInput = {
              kind,
              storagePath: res.publicId,
              resourceType: res.resourceType,
              mime: file.type || 'application/octet-stream',
              sizeBytes: res.bytes,
              width: res.width,
              height: res.height,
              durationMs: res.durationMs,
              originalFilename: file.name,
            }
            setUploads((prev) =>
              prev.map((u) =>
                u.id === pending.id
                  ? { ...u, attachment, progress: 100 }
                  : u,
              ),
            )
          } catch (err) {
            console.error('[composer] upload failed', err)
            setUploads((prev) =>
              prev.map((u) =>
                u.id === pending.id
                  ? { ...u, error: 'Upload failed' }
                  : u,
              ),
            )
            showToast(`${pending.name} failed to upload`, { type: 'error' })
          }
        }),
      )
    },
    [conversationId],
  )

  const removeUpload = (id: string) => {
    setUploads((prev) => {
      const found = prev.find((u) => u.id === id)
      found?.abort?.abort()
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl)
      return prev.filter((u) => u.id !== id)
    })
  }

  // Voice recorder takeover — parent hides composer while recording.
  if (recording) {
    return (
      <VoiceRecorder
        conversationId={conversationId}
        onCancel={() => setRecording(false)}
        onSend={async (attachment) => {
          // Voice goes out on its own without text. Use the same send path
          // so it flows through the optimistic / broadcast pipeline.
          setRecording(false)
          const res = await onSend('', [attachment])
          if (!res.ok) {
            showToast(res.message ?? 'Could not send voice.', { type: 'error' })
          }
        }}
      />
    )
  }

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      {/* Reply banner. Rendered above everything else so it's visually
          attached to the composer — Discord/WhatsApp pattern. */}
      {replyingTo ? (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-[12px]">
          <CornerUpLeft className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="shrink-0 text-muted-foreground">Replying to</span>
          <span className="shrink-0 font-semibold text-foreground">
            {replyingTo.senderName}
          </span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {replyingTo.preview || '—'}
          </span>
          {onCancelReply ? (
            <button
              type="button"
              onClick={onCancelReply}
              aria-label="Cancel reply"
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Pending-upload previews — real media thumbnails (not filenames).
          Images + videos render from local blob URLs so the user sees
          what they picked instantly, even before Cloudinary finishes. */}
      {uploads.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {uploads.map((u) => (
            <UploadPreview
              key={u.id}
              upload={u}
              onRemove={() => removeUpload(u.id)}
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        {/* + popover */}
        <div className="relative">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setPlusOpen((v) => !v)}
            aria-label="Attachment options"
            className="size-10 rounded-full text-muted-foreground"
          >
            <Plus
              className={cn('size-5 transition-transform', plusOpen && 'rotate-45')}
            />
          </Button>
          {plusOpen ? (
            <>
              <button
                type="button"
                aria-hidden
                className="fixed inset-0 z-10"
                onClick={() => setPlusOpen(false)}
              />
              <div className="absolute bottom-12 left-0 z-20 w-48 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
                <MenuItem onClick={openImagePicker} icon={ImageIcon}>
                  Upload image
                </MenuItem>
                <MenuItem onClick={openVideoPicker} icon={VideoIcon}>
                  Upload video
                </MenuItem>
                <MenuItem onClick={openFilePicker} icon={FileText}>
                  Upload file
                </MenuItem>
                <MenuItem onClick={startVoice} icon={Mic}>
                  Voice message
                </MenuItem>
              </div>
            </>
          ) : null}
        </div>

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (e.target.value.length > 0) onType?.()
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          maxLength={MAX}
          disabled={disabled}
          className="max-h-40 min-h-10 resize-none rounded-2xl bg-muted/60 px-4 py-2.5"
        />

        <Button
          type="button"
          onClick={submit}
          disabled={!canSend}
          size="icon"
          aria-label="Send message"
          className="size-10 shrink-0 rounded-full"
        >
          <SendHorizonal className="size-4" />
        </Button>
      </div>

      {/* Hidden file inputs — the + popover items drive them. */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        multiple
        onChange={(e) => {
          void handleFiles(e.target.files, 'IMAGE')
          e.target.value = ''
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        multiple
        onChange={(e) => {
          void handleFiles(e.target.files, 'VIDEO')
          e.target.value = ''
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => {
          void handleFiles(e.target.files, 'FILE')
          e.target.value = ''
        }}
      />

      {footerHint ? (
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="min-w-0 truncate">{footerHint}</span>
          <span className="shrink-0 tabular-nums">
            {value.length} / {MAX}
          </span>
        </div>
      ) : null}
    </div>
  )
}

function MenuItem({
  icon: Icon,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
    >
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </button>
  )
}

function UploadPreview({
  upload,
  onRemove,
}: {
  upload: PendingUpload
  onRemove: () => void
}) {
  const uploading = !upload.attachment && !upload.error
  const failed = Boolean(upload.error)
  const ready = Boolean(upload.attachment) && !failed

  // Media kinds get a real thumbnail tile. Files get a compact chip.
  const isMedia = upload.kind === 'IMAGE' || upload.kind === 'VIDEO'

  if (!isMedia) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-[11px]',
          failed && 'border-destructive/40 text-destructive',
        )}
      >
        <FileText className="size-3.5 text-muted-foreground" />
        <span className="max-w-[160px] truncate">{upload.name}</span>
        <span className="tabular-nums text-muted-foreground">
          {formatBytes(upload.size)}
        </span>
        {uploading ? (
          <span className="tabular-nums text-muted-foreground">
            · {upload.progress}%
          </span>
        ) : failed ? (
          <span>Failed</span>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Remove"
        >
          <X className="size-3" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted',
        failed && 'border-destructive/60',
      )}
    >
      {upload.kind === 'IMAGE' && upload.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={upload.previewUrl}
          alt={upload.name}
          className="size-full object-cover"
        />
      ) : upload.kind === 'VIDEO' && upload.previewUrl ? (
        <video
          src={upload.previewUrl}
          muted
          preload="metadata"
          className="size-full object-cover"
        />
      ) : null}

      {/* Progress / ready overlays */}
      {uploading ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/70 to-transparent py-1 text-[10px] font-semibold text-white">
          {upload.progress}%
        </div>
      ) : failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/30 text-[10px] font-semibold text-destructive-foreground">
          Failed
        </div>
      ) : ready ? null : null}

      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        aria-label="Remove"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
