/**
 * Notification senders are stubbed when env vars are missing in
 * `.env.test`, but tests need to ASSERT what was attempted — not just
 * that nothing crashed.
 *
 * This module wraps each sender so tests can read calls back. Pair with
 * vi.mock at the top of the integration test file.
 */

import { vi } from 'vitest'

type EmailCall = { to: string; subject: string; html?: string; text?: string; tag?: string }
type SmsCall = { to: string; body: string; type?: string }
type PushCall = { userId: string; title: string; body?: string; data?: Record<string, unknown> }

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
    sendEmail: vi.fn(async (args: EmailCall) => {
      emails.push(args)
      return { id: `email-${emails.length}` }
    }),
  }
}

export function mockSms() {
  return {
    sendSms: vi.fn(async (args: SmsCall) => {
      smses.push(args)
      return { sid: `sms-${smses.length}` }
    }),
  }
}

export function mockPush() {
  return {
    sendPush: vi.fn(async (args: PushCall) => {
      pushes.push(args)
      return { sent: true }
    }),
  }
}
