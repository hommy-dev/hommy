/**
 * Smoke-test SMS sending end-to-end through the real `sendSms()` dispatcher
 * (same code the notification pipeline uses), so it proves your Twilio config
 * actually delivers a text.
 *
 * Usage:
 *   pnpm sms:test -- --to=+1XXXXXXXXXX
 *   pnpm sms:test -- --to=+1XXXXXXXXXX --body="Custom message"
 *   npx tsx scripts/test-sms.ts +1XXXXXXXXXX          (positional also works)
 *
 * Reports which provider will be used, masks the credentials, and prints the
 * send result. Common failures to look for in the output:
 *   • "not a valid phone number" / 21211 → the --to number is wrong/not E.164
 *   • 21608 "unverified" → Twilio TRIAL can only text Verified Caller IDs
 *   • 21606 → your TWILIO_PHONE_NUMBER can't send SMS / isn't owned
 *   • 20003 → bad TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN
 */

import 'dotenv/config'
import { sendSms } from '../src/lib/notifications/sms'

// NOTE: we deliberately don't import normalizeToE164 here. libphonenumber-js's
// JSON metadata gets default-wrapped under tsx/esbuild and crashes (a tsx-only
// quirk — it works fine in the Next app). For this smoke test, just require a
// number already in +E.164 form.
const E164_RE = /^\+[1-9]\d{6,14}$/

function parseTo(argv: string[]): string | undefined {
  for (const arg of argv) {
    if (arg.startsWith('--to=')) return arg.slice('--to='.length)
  }
  // First positional (non-flag) argument.
  const positional = argv.find((a) => !a.startsWith('--'))
  return positional
}

function parseBody(argv: string[]): string | undefined {
  const arg = argv.find((a) => a.startsWith('--body='))
  return arg?.slice('--body='.length)
}

function activeProvider(): string {
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID)
  ) {
    return process.env.TWILIO_MESSAGING_SERVICE_SID ? 'Twilio (Messaging Service)' : 'Twilio (from number)'
  }
  return 'STUB (Twilio not configured — will only log)'
}

async function main() {
  const argv = process.argv.slice(2)
  const rawTo = parseTo(argv) ?? process.env.TEST_SMS_TO
  const body = parseBody(argv) ?? `Hommy test ✅ — SMS is working. ${new Date().toLocaleTimeString()}`

  const sid = process.env.TWILIO_ACCOUNT_SID
  console.log('[sms:test] config', {
    provider: activeProvider(),
    twilioSid: sid ? sid.slice(0, 6) + '…' : null,
    from: process.env.TWILIO_PHONE_NUMBER ?? null,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID ?? null,
  })

  if (!rawTo) {
    console.error('[sms:test] Missing recipient. Pass --to=+1XXXXXXXXXX (or set TEST_SMS_TO in .env)')
    process.exit(1)
  }

  const to = rawTo.trim()
  if (!E164_RE.test(to)) {
    console.error(
      `[sms:test] "${rawTo}" must be in full international format with the + and country code, e.g. +923147651112`,
    )
    process.exit(1)
  }

  console.log(`[sms:test] sending to ${to}…`)
  const t0 = Date.now()
  const res = await sendSms(to, body)
  const tookMs = Date.now() - t0

  if (!res.success) {
    console.error('[sms:test] FAILED', { tookMs, error: res.error })
    process.exit(1)
  }
  console.log('[sms:test] OK', { tookMs })
  console.log('[sms:test] If this returned OK but no text arrived, check Twilio Console → Monitor → Logs → Messaging.')
  process.exit(0)
}

main()
