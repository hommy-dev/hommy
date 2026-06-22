/**
 * In-test capture of Inngest events.
 *
 * Server actions call `inngest.send({ name, data })` to schedule async work. We
 * don't run the Inngest dev server in tests — we replace `inngest` with a
 * capturing stub while KEEPING the real `INNGEST_EVENTS` constants (so event
 * names asserted in tests always match production).
 *
 * Usage (top of the test file — vi.mock is hoisted):
 *
 *   import { capturingInngest, getCapturedInngestEvents } from '../helpers/inngest'
 *   vi.mock('@/lib/inngest/client', async (importOriginal) => ({
 *     ...(await importOriginal()),     // keeps the real INNGEST_EVENTS
 *     inngest: capturingInngest,       // overrides only the client
 *   }))
 *   // ...inside a test, after the action runs:
 *   expect(getCapturedInngestEvents().byName('lead/engaged')).toHaveLength(1)
 */

import { vi } from 'vitest'

type CapturedEvent = { name: string; data: Record<string, unknown> }

const captured: CapturedEvent[] = []

export const capturingInngest = {
  send: vi.fn(async (event: { name: string; data?: Record<string, unknown> }) => {
    captured.push({ name: event.name, data: event.data ?? {} })
    return { ids: [`captured-${captured.length}`] }
  }),
}

export function resetCapturedInngestEvents(): void {
  captured.length = 0
  capturingInngest.send.mockClear()
}

export function getCapturedInngestEvents() {
  return {
    all(): readonly CapturedEvent[] {
      return [...captured]
    },
    byName(name: string): CapturedEvent[] {
      return captured.filter((e) => e.name === name)
    },
    has(name: string): boolean {
      return captured.some((e) => e.name === name)
    },
    count(): number {
      return captured.length
    },
  }
}
