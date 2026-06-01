'use client'

import { Download, FileText, Paperclip } from 'lucide-react'
import { buildCloudinaryUrl } from '@/lib/cloudinary/chat-upload'
import { cn } from '@/lib/utils'
import type { ChatAttachment } from '../use-chat-messages'

type Props = {
  attachment: ChatAttachment
  className?: string
}

/**
 * Non-media file card. Shows filename + size + a download button that
 * hits the Cloudinary raw URL directly.
 */
export function FileAttachment({ attachment, className }: Props) {
  const url = buildCloudinaryUrl(attachment.storagePath, 'raw')
  const Icon = attachment.mime === 'application/pdf' ? FileText : Paperclip

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.originalFilename ?? undefined}
      className={cn(
        'inline-flex max-w-md items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-2.5 text-left transition',
        'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {attachment.originalFilename ?? 'Attachment'}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {formatBytes(attachment.sizeBytes)}
        </span>
      </span>
      <Download className="size-4 shrink-0 text-muted-foreground" />
    </a>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
