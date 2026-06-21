'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { showToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  formatBytes,
  isBlockedFile,
} from '@/lib/chat/attachments'

/**
 * A file the user picked. We DON'T upload yet — files are held locally (with a
 * preview) and only uploaded when the message is actually sent. This keeps the
 * composer instant and avoids burning Cloudinary storage on files the user
 * picks then removes before sending.
 */
type Staged = {
  id: string
  file: File
  name: string
  bytes: number
  isImage: boolean
  previewUrl?: string // object URL, images only
}

let stagedCounter = 0

/**
 * Composer with text + file attachments. Enter sends, Shift+Enter inserts a
 * newline. Files are staged locally and uploaded by the thread on send. Any
 * file type is allowed except executables/scripts.
 */
export function MessageComposer({
  onSend,
  disabled,
}: {
  onSend: (body: string, files: File[]) => void
  disabled?: boolean
}) {
  const [value, setValue] = useState('')
  const [staged, setStaged] = useState<Staged[]>([])
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Revoke any image object URLs on unmount.
  const stagedRef = useRef<Staged[]>([])
  stagedRef.current = staged
  useEffect(() => {
    return () => {
      stagedRef.current.forEach((s) => s.previewUrl && URL.revokeObjectURL(s.previewUrl))
    }
  }, [])

  const canSend = (value.trim().length > 0 || staged.length > 0) && !disabled

  function pickFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    const incoming = Array.from(list)
    const remaining = MAX_ATTACHMENTS_PER_MESSAGE - staged.length
    if (remaining <= 0) {
      showToast(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files.`, { type: 'warning' })
      return
    }

    const accepted: Staged[] = []
    for (const file of incoming) {
      if (accepted.length >= remaining) {
        showToast(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files.`, { type: 'warning' })
        break
      }
      if (isBlockedFile(file.name)) {
        showToast(`${file.name} can't be shared for security reasons.`, { type: 'error' })
        continue
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        showToast(`${file.name} is too large (max ${formatBytes(MAX_ATTACHMENT_BYTES)}).`, { type: 'error' })
        continue
      }
      const isImg = file.type.startsWith('image/')
      accepted.push({
        id: `staged-${++stagedCounter}`,
        file,
        name: file.name,
        bytes: file.size,
        isImage: isImg,
        previewUrl: isImg ? URL.createObjectURL(file) : undefined,
      })
    }
    if (accepted.length > 0) setStaged((prev) => [...prev, ...accepted])
  }

  function removeStaged(id: string) {
    setStaged((prev) => {
      const target = prev.find((s) => s.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((s) => s.id !== id)
    })
  }

  function submit() {
    const body = value.trim()
    if ((!body && staged.length === 0) || disabled) return
    onSend(body, staged.map((s) => s.file))
    // The thread owns the upload + optimistic preview now; drop our local copies.
    staged.forEach((s) => s.previewUrl && URL.revokeObjectURL(s.previewUrl))
    setStaged([])
    setValue('')
    if (ref.current) ref.current.style.height = 'auto'
  }

  function grow() {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div className="px-4 pb-4 pt-1 lg:px-[1.111vw] lg:pb-[1.111vw] lg:pt-[0.278vw]">
      {staged.length > 0 ? (
        <div className="mb-2 lg:mb-[0.556vw] flex flex-wrap gap-2 lg:gap-[0.556vw]">
          {staged.map((s) => (
            <StagedChip key={s.id} staged={s} onRemove={() => removeStaged(s.id)} />
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2 lg:gap-[0.556vw] rounded lg:rounded-[0.5vw] border border-input bg-card py-1.5 pl-1.5 pr-1.5 lg:py-[0.417vw] lg:pl-[0.417vw] lg:pr-[0.417vw] transition-colors focus-within:border-ring">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || staged.length >= MAX_ATTACHMENTS_PER_MESSAGE}
          aria-label="Attach files"
          title="Attach files"
          className="inline-grid size-8 lg:size-[2.222vw] shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <Icon name="plus" className="size-5 lg:size-[1.389vw]" />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            pickFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <textarea
          ref={ref}
          value={value}
          rows={1}
          onChange={(e) => {
            setValue(e.target.value)
            grow()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Write a message…"
          className="max-h-40 lg:max-h-[11vw] min-h-8 lg:min-h-[2.222vw] flex-1 resize-none border-0 bg-transparent py-1 lg:py-[0.278vw] text-sm lg:text-[0.903vw] leading-6 lg:leading-[1.666vw] outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            'inline-grid size-8 lg:size-[2.222vw] shrink-0 place-items-center rounded-full transition-all',
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon name="arrow-up" className="size-4 lg:size-[1.111vw]" />
        </button>
      </div>
    </div>
  )
}

/** A single staged file: image thumbnail or document chip, with remove. */
function StagedChip({ staged, onRemove }: { staged: Staged; onRemove: () => void }) {
  return (
    <div className="group relative flex items-center gap-2 lg:gap-[0.556vw] overflow-hidden rounded-md lg:rounded-[0.556vw] border border-border bg-background pr-2 lg:pr-[0.556vw]">
      {staged.isImage && staged.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={staged.previewUrl} alt={staged.name} className="size-10 lg:size-[2.778vw] shrink-0 object-cover" />
      ) : (
        <span className="grid size-10 lg:size-[2.778vw] shrink-0 place-items-center bg-muted text-muted-foreground">
          <Icon name="document" className="size-5 lg:size-[1.389vw]" />
        </span>
      )}
      <div className="min-w-0 py-1 lg:py-[0.278vw]">
        <p className="max-w-40 lg:max-w-[11vw] truncate text-xs lg:text-[0.833vw] font-medium">{staged.name}</p>
        <p className="text-[10px] lg:text-[0.694vw] text-muted-foreground">{formatBytes(staged.bytes)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${staged.name}`}
        className="grid size-5 lg:size-[1.389vw] shrink-0 place-items-center rounded-full bg-background/80 text-muted-foreground transition-colors hover:text-destructive"
      >
        <Icon name="close" className="size-3.5 lg:size-[0.972vw]" />
      </button>
    </div>
  )
}
