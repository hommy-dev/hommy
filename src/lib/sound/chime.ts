/**
 * Subtle synthesized chime for inbound chat events.
 *
 * Synthesizes a short descending two-tone via Web Audio API so we don't
 * have to ship an audio asset. Plays only after the user has interacted
 * with the page (browsers block autoplay), and respects
 * `prefers-reduced-motion`.
 *
 * Use sparingly — only for events the user genuinely cares about
 * (AI reply arriving, quote accepted, payment released). Not on every
 * click or it becomes noise.
 */

let audioCtx: AudioContext | null = null
let userInteracted = false

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

if (typeof window !== 'undefined') {
  const markInteracted = () => {
    userInteracted = true
    document.removeEventListener('pointerdown', markInteracted)
    document.removeEventListener('keydown', markInteracted)
  }
  document.addEventListener('pointerdown', markInteracted, { passive: true })
  document.addEventListener('keydown', markInteracted)
}

function reducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtx) return audioCtx
  const w = window as AudioWindow
  const Ctor = window.AudioContext ?? w.webkitAudioContext
  if (!Ctor) return null
  audioCtx = new Ctor()
  return audioCtx
}

/**
 * Soft descending two-tone (~200ms). Use for inbound AI replies.
 */
export function chime(): void {
  if (typeof window === 'undefined') return
  if (reducedMotion()) return
  if (!userInteracted) return
  const ctx = getCtx()
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.exponentialRampToValueAtTime(523, now + 0.14)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)
    osc.start(now)
    osc.stop(now + 0.22)
  } catch {
    // Browsers may still refuse — swallow.
  }
}
