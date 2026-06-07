'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { buildCloudinaryUrl } from '@/lib/cloudinary/chat-upload'
import { cn } from '@/lib/utils'
import type { ChatAttachment } from '../use-chat-messages'

type Props = {
  attachment: ChatAttachment
  mine?: boolean
  className?: string
}

const SPEEDS = [1, 1.5, 2] as const
const BAR_COUNT = 48

/**
 * Voice message player — the Discord/WhatsApp pill.
 *
 * Layout: [▶] ·|·|·|·||·| · 0:18 · [1x] · [🔊]
 *
 * Waveform bars come from `attachment.waveformPeaks` — the recorder
 * precomputes ~100 peak samples and stores them in DB metadata so the
 * shape is visible before the audio even starts loading. If peaks are
 * missing (old messages or edge cases), we render a flat centered line.
 */
export function VoicePlayer({ attachment, mine, className }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)          // 0..1
  const [speedIdx, setSpeedIdx] = useState(0)
  const [muted, setMuted] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)

  // Cloudinary stores audio under `video` resource_type (Opus in WebM)
  // by default — the upload helper captures resourceType so we honor it.
  const src = useMemo(
    () =>
      buildCloudinaryUrl(
        attachment.storagePath,
        attachment.resourceType === 'raw' ? 'raw' : 'video',
      ),
    [attachment.storagePath, attachment.resourceType],
  )

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.playbackRate = SPEEDS[speedIdx]
  }, [speedIdx])

  // Downsample / upsample peaks to a stable bar count so the layout is
  // consistent across messages regardless of recording length.
  const bars = useMemo(
    () => resampleBars(attachment.waveformPeaks ?? [], BAR_COUNT),
    [attachment.waveformPeaks],
  )

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      void a.play()
    } else {
      a.pause()
    }
  }

  const onScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current
    if (!a || !a.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    a.currentTime = ratio * a.duration
    setProgress(ratio)
  }

  const totalMs = attachment.durationMs ?? 0

  return (
    <div
      className={cn(
        'inline-flex max-w-md lg:max-w-[31.108vw] items-center gap-2.5 lg:gap-[0.694vw] rounded-full border px-2 lg:px-[0.556vw] py-1.5 lg:py-[0.417vw] shadow-sm',
        mine
          ? 'border-primary/20 bg-primary/10'
          : 'border-border bg-background/70',
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setProgress(0)
          setCurrentMs(0)
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget
          const p = a.duration ? a.currentTime / a.duration : 0
          setProgress(p)
          setCurrentMs(a.currentTime * 1000)
        }}
        muted={muted}
      />

      <button
        type="button"
        onClick={toggle}
        className="inline-flex size-8 lg:size-[2.222vw] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="size-3.5 lg:size-[0.972vw]" /> : <Play className="size-3.5 lg:size-[0.972vw] translate-x-px lg:translate-x-[0.069vw]" />}
      </button>

      <div
        className="flex min-w-[140px] lg:min-w-[9.722vw] flex-1 cursor-pointer items-center gap-[2px] lg:gap-[0.139vw]"
        onClick={onScrub}
        role="slider"
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        {bars.map((h, i) => {
          const played = i / BAR_COUNT <= progress
          return (
            <span
              key={i}
              aria-hidden
              className={cn(
                'inline-block rounded-full transition-colors',
                played
                  ? mine
                    ? 'bg-primary-foreground/90'
                    : 'bg-primary'
                  : 'bg-muted-foreground/40',
              )}
              style={{
                width: 2,
                height: `${Math.max(3, Math.round(h * 18))}px`,
              }}
            />
          )
        })}
      </div>

      <span className="shrink-0 tabular-nums text-[11px] lg:text-[0.764vw] text-muted-foreground">
        {formatDuration(playing || currentMs > 0 ? currentMs : totalMs)}
      </span>

      <button
        type="button"
        onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
        className="shrink-0 rounded-full bg-muted px-1.5 lg:px-[0.417vw] py-0.5 lg:py-[0.139vw] text-[10px] lg:text-[0.694vw] font-semibold tabular-nums text-muted-foreground hover:bg-muted/80"
        aria-label="Change playback speed"
      >
        {SPEEDS[speedIdx]}x
      </button>

      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX className="size-4 lg:size-[1.111vw]" /> : <Volume2 className="size-4 lg:size-[1.111vw]" />}
      </button>
    </div>
  )
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Resample a waveform-peaks array to a fixed bar count. Simple block
 * averaging — good enough for visual purposes.
 */
function resampleBars(peaks: number[], target: number): number[] {
  if (peaks.length === 0) {
    // No peaks — render a stable flat pattern.
    return Array.from({ length: target }, (_, i) =>
      0.3 + 0.35 * Math.sin(i * 0.5),
    )
  }
  if (peaks.length === target) return peaks
  const out: number[] = new Array(target).fill(0)
  const ratio = peaks.length / target
  for (let i = 0; i < target; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(peaks.length, Math.ceil((i + 1) * ratio))
    let sum = 0
    let n = 0
    for (let j = start; j < end; j++) {
      sum += Math.abs(peaks[j])
      n += 1
    }
    out[i] = n ? sum / n : 0
  }
  // Normalize 0..1
  const max = Math.max(...out) || 1
  return out.map((v) => v / max)
}
