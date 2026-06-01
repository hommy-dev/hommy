/**
 * In-test capture of Inngest events.
 *
 * Server actions use `inngest.send({ name, data })` to schedule async
 * work. In tests we don't actually run the Inngest dev server — we
 * intercept `send()` and record what was emitted, then make assertions.
 *
 * Pair with `vi.mock('@/lib/inngest/client', () => ({ ...mockInngestClient() }))`
 * at the top of any test file that touches code calling `inngest.send`.
 *
 * Example:
 *   import { mockInngestClient } from '../helpers/inngest'
 *   vi.mock('@/lib/inngest/client', () => mockInngestClient())
 *   // ...
 *   const events = getCapturedInngestEvents()
 *   expect(events.byName('quote/cooling-off.scheduled')).toHaveLength(1)
 */

import { vi } from 'vitest'

type CapturedEvent = {
  name: string
  data: Record<string, unknown>
  ts: string
}

const captured: CapturedEvent[] = []

// Mirror the production INNGEST_EVENTS map so callers using
// INNGEST_EVENTS.PAYMENT_AUTO_RELEASE_SCHEDULED resolve to the same
// string ("payment/auto-release.scheduled") that test assertions
// reference. Keep in sync with src/lib/inngest/client.ts.
export const INNGEST_EVENTS_MIRROR = {
  PROJECT_MATCHING_REQUESTED: 'project/matching.requested',
  PROJECT_MATCHING_RETRY: 'project/matching.retry',
  PROJECT_EXPIRY_SCHEDULED: 'project/expiry.scheduled',
  LEAD_EXPIRY_SCHEDULED: 'lead/expiry.scheduled',
  LEAD_DECLINE_PROCESSED: 'lead/decline.processed',
  QUOTE_SUBMITTED: 'quote/submitted',
  QUOTE_EXPIRY_SCHEDULED: 'quote/expiry.scheduled',
  QUOTE_ACCEPTED: 'quote/accepted',
  JOB_CREATED: 'job/created',
  PAYMENT_AUTO_RELEASE_SCHEDULED: 'payment/auto-release.scheduled',
  PAYMENT_AUTO_RELEASE_CANCELLED: 'payment/auto-release.cancelled',
  PAYMENT_RELEASE_WARNING_T24: 'payment/release-warning.t24',
  PAYMENT_RELEASE_WARNING_T48: 'payment/release-warning.t48',
  PAYMENT_RELEASE_WARNING_T66: 'payment/release-warning.t66',
  REVIEW_REQUEST_SCHEDULED: 'review/request.scheduled',
  REVIEW_SUBMITTED: 'review/submitted',
  CONTRACTOR_FIRST_LEAD_SCHEDULED: 'contractor/first-lead.scheduled',
  NOTIFICATION_LEAD_EXPIRY_WARNING: 'notification/lead-expiry-warning',
  SITE_VISIT_REQUESTED: 'site-visit/requested',
  SITE_VISIT_SCHEDULED: 'site-visit/scheduled',
  QUOTE_COOLING_OFF_SCHEDULED: 'quote/cooling-off.scheduled',
  JOB_LIFECYCLE_SCHEDULED: 'job/lifecycle.scheduled',
  CHAT_SENTIMENT_REQUESTED: 'chat/sentiment.requested',
} as const

export function mockInngestClient() {
  return {
    inngest: {
      send: vi.fn(async (event: { name: string; data?: Record<string, unknown> }) => {
        captured.push({
          name: event.name,
          data: event.data ?? {},
          ts: new Date().toISOString(),
        })
        return { ids: [`captured-${captured.length}`] }
      }),
    },
    INNGEST_EVENTS: INNGEST_EVENTS_MIRROR,
  }
}

export function resetCapturedInngestEvents(): void {
  captured.length = 0
}

export function getCapturedInngestEvents() {
  return {
    all(): readonly CapturedEvent[] {
      return [...captured]
    },
    byName(name: string): CapturedEvent[] {
      return captured.filter((e) => e.name === name)
    },
    /** Did any captured event have this name? */
    has(name: string): boolean {
      return captured.some((e) => e.name === name)
    },
    count(): number {
      return captured.length
    },
  }
}
