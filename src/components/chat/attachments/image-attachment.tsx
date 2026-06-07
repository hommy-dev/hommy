'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { CloudImage } from '@/components/ui/cloud-image'
import { cn } from '@/lib/utils'
import type { ChatAttachment } from '../use-chat-messages'

type Props = {
  attachment: ChatAttachment
  className?: string
}

/**
 * Image attachment — renders a rounded thumbnail inside a message.
 * Clicks open a simple lightbox (full-screen overlay with the original
 * image). Cloudinary handles f_auto/q_auto for format + quality.
 */
export function ImageAttachment({ attachment, className }: Props) {
  const [open, setOpen] = useState(false)

  // Clamp display dimensions so tall screenshots don't dominate the
  // thread. Discord caps at ~400px wide; we do the same.
  const maxW = 400
  const maxH = 300
  const ratio =
    attachment.width && attachment.height
      ? attachment.width / attachment.height
      : 4 / 3
  const displayW = Math.min(maxW, attachment.width ?? maxW)
  const displayH = Math.min(maxH, Math.round(displayW / ratio))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group relative overflow-hidden rounded-lg lg:rounded-[0.694vw] border border-border bg-muted/40 transition',
          'hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        style={{ width: displayW, height: displayH }}
        aria-label="Open image"
      >
        <CloudImage
          src={attachment.storagePath}
          width={displayW * 2}
          height={displayH * 2}
          alt={attachment.originalFilename ?? 'Image attachment'}
          sizes={`${displayW}px`}
          className="size-full object-cover"
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 lg:p-[1.111vw]"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 lg:right-[1.111vw] top-4 lg:top-[1.111vw] inline-flex size-10 lg:size-[2.778vw] items-center justify-center rounded-full bg-background/10 text-white hover:bg-background/20"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
            aria-label="Close"
          >
            <X className="size-5 lg:size-[1.389vw]" />
          </button>
          <div
            className="max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <CloudImage
              src={attachment.storagePath}
              width={attachment.width ?? 1600}
              height={attachment.height ?? 1200}
              alt={attachment.originalFilename ?? 'Image attachment'}
              sizes="90vw"
              className="max-h-[90vh] max-w-[90vw] rounded-lg lg:rounded-[0.694vw] object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
