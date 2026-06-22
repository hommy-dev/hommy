/**
 * Mock the realtime broadcast transport in integration tests.
 *
 * EVERY live push — chat messages (`@/lib/messaging/system`), user-channel
 * events (`@/lib/realtime/user-events`), and the credit-chip refresh
 * (`@/lib/credits/notify`) — funnels through `sendRealtimeBroadcast`
 * (`@/lib/realtime/broadcast`). Mocking that single seam neutralizes all of
 * them at once: the DB writes that back these broadcasts still happen (so a
 * test can assert the real `messages` / `notifications` rows), but no HTTP call
 * leaves the process.
 *
 * `.env.test` SETS stub Supabase values, so without this mock the broadcaster
 * would actually fetch `http://localhost:54321` and fail per call — slow and
 * noisy. Mock it in any test that drives an action with post-commit comms:
 *
 *   import { mockRealtimeBroadcast, getBroadcasts } from '../helpers/realtime'
 *   vi.mock('@/lib/realtime/broadcast', () => mockRealtimeBroadcast())
 */

import { vi } from 'vitest'

type Broadcast = { topic: string; event: string; payload: unknown }

const broadcasts: Broadcast[] = []

export function resetBroadcasts(): void {
  broadcasts.length = 0
}

export function getBroadcasts(): readonly Broadcast[] {
  return [...broadcasts]
}

export function mockRealtimeBroadcast() {
  return {
    sendRealtimeBroadcast: vi.fn(async (msgs: Broadcast | Broadcast[]) => {
      for (const m of Array.isArray(msgs) ? msgs : [msgs]) broadcasts.push(m)
      return { ok: true as const }
    }),
  }
}
