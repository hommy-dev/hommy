/**
 * Capture outbound notifications in tests.
 *
 * The real low-level senders live in three modules and no-op in `.env.test`
 * (no RESEND/SMS/VAPID keys), but tests sometimes need to ASSERT what was
 * attempted. These factories mock each sender module with its REAL signature.
 *
 * Usage (top of the test file — one vi.mock per module you care about):
 *
 *   import { mockEmail, mockSms, mockPush, getSentEmails } from '../helpers/notifications'
 *   vi.mock('@/lib/notifications/email', () => mockEmail())
 *   vi.mock('@/lib/notifications/sms', () => mockSms())
 *   vi.mock('@/lib/notifications/push', () => mockPush())
 *
 * Real signatures (src/lib/notifications/*):
 *   email.ts  → sendEmail(to, subject, html): Promise<{ success; error? }>
 *   sms.ts    → sendSms(to, body): Promise<{ success; error? }>
 *   push.ts   → sendPushToUser(userId, payload): Promise<void>
 *
 * Note: when testing the `sendNotification()` core end-to-end you usually DON'T
 * mock these — let it write the real in-app `notifications` row and assert that.
 */

import { vi } from 'vitest'

type EmailCall = { to: string; subject: string; html: string }
type SmsCall = { to: string; body: string }
type PushCall = { userId: string; payload: { title: string; body?: string; actionUrl?: string; entityId?: string } }

const emails: EmailCall[] = []
const smses: SmsCall[] = []
const pushes: PushCall[] = []

export function resetNotificationMocks(): void {
  emails.length = 0
  smses.length = 0
  pushes.length = 0
}

export function getSentEmails(): readonly EmailCall[] {
  return [...emails]
}
export function getSentSmses(): readonly SmsCall[] {
  return [...smses]
}
export function getSentPushes(): readonly PushCall[] {
  return [...pushes]
}

export function mockEmail() {
  return {
    sendEmail: vi.fn(async (to: string, subject: string, html: string) => {
      emails.push({ to, subject, html })
      return { success: true as const }
    }),
  }
}

export function mockSms() {
  return {
    sendSms: vi.fn(async (to: string, body: string) => {
      smses.push({ to, body })
      return { success: true as const }
    }),
  }
}

export function mockPush() {
  return {
    sendPushToUser: vi.fn(async (userId: string, payload: PushCall['payload']) => {
      pushes.push({ userId, payload })
    }),
  }
}
