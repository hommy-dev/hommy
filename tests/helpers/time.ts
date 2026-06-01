/**
 * Time-travel helpers for tests that exercise expiry windows,
 * cooling-off, auto-release, and Inngest cron logic.
 *
 * Vitest's fake timers cover `Date.now()`, `setTimeout`, and friends.
 * We add domain-aware shortcuts so test bodies read naturally:
 *
 *   await fastForwardHours(72)   // skip past auto-release window
 *   await fastForwardDays(7)     // skip past review reveal window
 */

import { vi } from 'vitest'
import { TIME_CONSTANTS } from '@/lib/config/tunables'

/** Snapshot the current time and start using fake timers from there. */
export function freezeTimeAt(iso: string): void {
  vi.useFakeTimers({ now: new Date(iso) })
}

export function freezeTimeNow(): void {
  vi.useFakeTimers()
}

export function unfreezeTime(): void {
  vi.useRealTimers()
}

export async function fastForwardMs(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms)
}

export async function fastForwardHours(h: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(h * TIME_CONSTANTS.HOUR_MS)
}

export async function fastForwardDays(d: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(d * TIME_CONSTANTS.DAY_MS)
}

/** Convenience for "now()" inside frozen-time tests. */
export function currentTime(): Date {
  return new Date()
}
