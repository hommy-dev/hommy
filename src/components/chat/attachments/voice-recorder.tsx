'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Send, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadChatAttachment } from '@/lib/cloudinary/chat-upload'
import type { AttachmentInput } from '@/lib/actions/chat'
import { showToast } from '@/components/ui/toast'

const MAX_RECORDING_MS = 5 * 60 * 1000 // 5 minutes
const TARGET_PEAKS = 100
const VISUAL_BARS = 36

type Props = {
  conversationId: string
  onCancel: () => void
  onSend: (attachment: AttachmentInput) => Promise<void>
}

/**
 * Inline voice recorder that replaces the composer while active.
 *
 * Pipeline:
 *   1. Request mic via `getUserMedia({ audio: true })`.
 *   2. Run two parallel streams:
 *       • MediaRecorder writes the actual file (Opus in WebM).
 *       • Web Audio API AnalyserNode samples the live waveform — we
 *         push ~100 evenly-spaced peak values into a buffer for later
 *         storage + display.
 *   3. On stop: assemble the Blob, upload to Cloudinary, hand the
 *      AttachmentInput to the parent (which calls sendMessageAction).
 *   4. Cancel: abort & drop everything; no upload.
 *
 * 5 minutes max. Auto-stops at the cap.
 */
export function VoiceRecorder({ conversationId, onCancel, onSend }: Props) {
  const [state, setState] = useState<'idle' | 'recording' | 'uploading'>(
    'idle',
  )
  const [elapsedMs, setElapsedMs] = useState(0)
  const [liveBars, setLiveBars] = useState<number[]>(
    Array.from({ length: VISUAL_BARS }, () => 0),
  )

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const peaksRef = useRef<number[]>([])
  const lastPeakPushRef = useRef(0)
  const startedAtRef = useRef(0)
  const abortedRef = useRef(false)

  // Main setup + cleanup.
  useEffect(() => {
    let cancelled = false
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream

        // Web Audio — analyser for live waveform.
        const AudioCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        const ctx = new AudioCtor()
        audioCtxRef.current = ctx
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)
        analyserRef.current = analyser

        // MediaRecorder — actual file.
        const mime = pickSupportedMime()
        const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
        }
        recorder.onstop = () => {
          if (abortedRef.current) return
          void finalizeAndUpload(recorder.mimeType || 'audio/webm')
        }
        recorderRef.current = recorder
        recorder.start(100) // 100ms chunks for smooth peaks
        startedAtRef.current = performance.now()
        setState('recording')
        pumpPeaks()
      } catch (err) {
        console.error('[voice] getUserMedia failed', err)
        showToast('Microphone permission denied', { type: 'error' })
        onCancel()
      }
    }
    void start()
    return () => {
      cancelled = true
      teardown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pumpPeaks = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    const buf = new Uint8Array(analyser.fftSize)
    const tick = () => {
      analyser.getByteTimeDomainData(buf)
      // Compute a single peak value for this frame.
      let peak = 0
      for (let i = 0; i < buf.length; i++) {
        const v = Math.abs(buf[i] - 128) / 128
        if (v > peak) peak = v
      }

      const now = performance.now()
      const elapsed = now - startedAtRef.current
      setElapsedMs(elapsed)

      // Throttle stored peak sampling so we end up near TARGET_PEAKS
      // regardless of frame rate / recording length.
      const sampleInterval = MAX_RECORDING_MS / TARGET_PEAKS
      if (now - lastPeakPushRef.current > sampleInterval) {
        peaksRef.current.push(peak)
        lastPeakPushRef.current = now
      }

      // Live-visual ring buffer for the growing waveform.
      setLiveBars((prev) => {
        const next = prev.slice(1)
        next.push(peak)
        return next
      })

      // Auto-stop at cap.
      if (elapsed >= MAX_RECORDING_MS) {
        handleStopAndSend()
        return
      }

      if (state !== 'idle') {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const teardown = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    const r = recorderRef.current
    if (r && r.state !== 'inactive') {
      try {
        r.stop()
      } catch {}
    }
    recorderRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    const ctx = audioCtxRef.current
    if (ctx && ctx.state !== 'closed') {
      void ctx.close().catch(() => {})
    }
    audioCtxRef.current = null
  }, [])

  const handleCancel = useCallback(() => {
    abortedRef.current = true
    teardown()
    onCancel()
  }, [onCancel, teardown])

  const handleStopAndSend = useCallback(() => {
    const r = recorderRef.current
    if (!r) return
    if (r.state === 'inactive') return
    setState('uploading')
    r.stop() // triggers onstop → finalizeAndUpload
  }, [])

  const finalizeAndUpload = useCallback(
    async (mime: string) => {
      try {
        const blob = new Blob(chunksRef.current, { type: mime })
        if (blob.size === 0) throw new Error('Empty recording')
        const peaks = peaksRef.current.slice()
        const durationMs = Math.round(performance.now() - startedAtRef.current)

        const ext = mime.includes('ogg')
          ? 'ogg'
          : mime.includes('mp4')
            ? 'm4a'
            : 'webm'
        const file = new File([blob], `voice-${Date.now()}.${ext}`, {
          type: mime,
        })

        const uploaded = await uploadChatAttachment(file, {
          conversationId,
          kind: 'AUDIO',
        })

        const attachment: AttachmentInput = {
          kind: 'AUDIO',
          storagePath: uploaded.publicId,
          resourceType: uploaded.resourceType,
          mime,
          sizeBytes: uploaded.bytes,
          durationMs: uploaded.durationMs ?? durationMs,
          waveformPeaks: peaks,
        }
        await onSend(attachment)
      } catch (err) {
        console.error('[voice] upload failed', err)
        showToast('Voice message failed to send', { type: 'error' })
      } finally {
        teardown()
      }
    },
    [conversationId, onSend, teardown],
  )

  const busy = state === 'uploading'

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <div
        className={cn(
          'flex items-center gap-3 rounded-full border border-border bg-muted/40 px-3 py-1.5',
          busy && 'opacity-60',
        )}
      >
        <button
          type="button"
          onClick={handleCancel}
          disabled={busy}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Cancel recording"
        >
          <Trash2 className="size-4" />
        </button>

        <span className="flex size-2 shrink-0 items-center justify-center">
          <span
            className={cn(
              'inline-block size-2 rounded-full bg-destructive',
              state === 'recording' && 'animate-pulse',
            )}
          />
        </span>

        <span className="shrink-0 tabular-nums text-[11px] font-medium text-foreground">
          {formatMs(elapsedMs)}
        </span>

        <div className="flex min-w-[120px] flex-1 items-center gap-[2px]">
          {liveBars.map((h, i) => (
            <span
              key={i}
              aria-hidden
              className="inline-block rounded-full bg-primary/80"
              style={{
                width: 2,
                height: `${Math.max(3, Math.round(h * 20))}px`,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleStopAndSend}
          disabled={busy}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          aria-label="Send voice message"
        >
          {busy ? (
            <Mic className="size-4 animate-pulse" />
          ) : (
            <Send className="size-4" />
          )}
        </button>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
        {busy
          ? 'Uploading…'
          : `Recording · max ${Math.floor(MAX_RECORDING_MS / 60000)} min`}
      </p>
    </div>
  )
}

function pickSupportedMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return undefined
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
