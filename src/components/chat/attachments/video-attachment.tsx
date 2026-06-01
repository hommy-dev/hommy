'use client'

import { useMemo, useRef, useState } from 'react'
import { Maximize2, Pause, Play, X } from 'lucide-react'
import { buildCloudinaryUrl } from '@/lib/cloudinary/chat-upload'
import { cn } from '@/lib/utils'
import type { ChatAttachment } from '../use-chat-messages'

type Props = {
  attachment: ChatAttachment
  className?: string
}

const MAX_INLINE_W = 400
const MAX_INLINE_H = 300

/**
 * Inline video player with a Cloudinary-hosted poster frame.
 *
 *   • The thumbnail shows the auto-generated first-frame poster
 *     (Cloudinary `f_jpg`/`so_0` via the raw transformation URL)
 *     until the user hits play — keeps LCP + scroll perf good.
 *   • Plays inline with native controls.
 *   • A fullscreen button in the top-right opens a lightbox over
 *     the app for a larger view — matches the image attachment UX.
 *
 * Video files go through Cloudinary's `video` resource_type; we reuse
 * that from the upload result. We don't do HLS / adaptive bitrate for
 * MVP — plain progressive MP4/WebM from Cloudinary's CDN is fine for
 * short clips in a chat. Can revisit if people upload long recordings.
 */
export function VideoAttachment({ attachment, className }: Props) {
  const [playing, setPlaying] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const inlineRef = useRef<HTMLVideoElement | null>(null)

  const ratio =
    attachment.width && attachment.height
      ? attachment.width / attachment.height
      : 16 / 9
  const displayW = Math.min(MAX_INLINE_W, attachment.width ?? MAX_INLINE_W)
  const displayH = Math.min(MAX_INLINE_H, Math.round(displayW / ratio))

  const videoUrl = useMemo(
    () => buildCloudinaryUrl(attachment.storagePath, 'video'),
    [attachment.storagePath],
  )
  // Cloudinary's image URL for the video resource returns the first-frame
  // poster. `so_0` = start offset 0 seconds; f_auto/q_auto keep it small.
  const posterUrl = useMemo(
    () =>
      `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload/so_0,f_jpg,q_auto/${attachment.storagePath}.jpg`,
    [attachment.storagePath],
  )

  const togglePlay = () => {
    const v = inlineRef.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }

  return (
    <>
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border border-border bg-black/40',
          className,
        )}
        style={{ width: displayW, height: displayH }}
      >
        <video
          ref={inlineRef}
          src={videoUrl}
          poster={posterUrl}
          preload="metadata"
          playsInline
          controls={playing}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="size-full object-cover"
        />

        {/* Custom overlay controls — visible before first play so the
            layout feels intentional (native controls only show after
            the user interacts with the custom play button). */}
        {!playing ? (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 text-white transition hover:bg-black/30"
            aria-label="Play video"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
              <Play className="size-5 translate-x-0.5" />
            </span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            inlineRef.current?.pause()
            setFullscreen(true)
          }}
          className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-md bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
          aria-label="Fullscreen"
        >
          <Maximize2 className="size-4" />
        </button>

        {attachment.durationMs ? (
          <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white backdrop-blur-sm">
            {formatDuration(attachment.durationMs)}
          </span>
        ) : null}
      </div>

      {fullscreen ? (
        <FullscreenPlayer
          src={videoUrl}
          poster={posterUrl}
          onClose={() => setFullscreen(false)}
        />
      ) : null}
    </>
  )
}

function FullscreenPlayer({
  src,
  poster,
  onClose,
}: {
  src: string
  poster: string
  onClose: () => void
}) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(true)

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Close"
      >
        <X className="size-5" />
      </button>

      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={ref}
          src={src}
          poster={poster}
          controls
          autoPlay
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="max-h-[90vh] max-w-[90vw] rounded-lg"
        />
        {!playing ? (
          <button
            type="button"
            onClick={() => void ref.current?.play()}
            className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Play"
          >
            <Play className="size-7 translate-x-0.5" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
