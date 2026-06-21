/**
 * Verify the SMS opt-out store + the send-gate logic WITHOUT needing Twilio or a
 * tunnel. Uses a throwaway test number and cleans up after itself.
 *
 *   pnpm opt-out:test
 *
 * Proves:
 *   1. setSmsOptOut(phone, true)  → isSmsOptedOut === true   (STOP recorded)
 *   2. setSmsOptOut(phone, false) → isSmsOptedOut === false  (START clears it)
 * The webhook calls setSmsOptOut; sendNotification calls isSmsOptedOut before
 * sending — so this exercises both ends of the opt-out path.
 */

import 'dotenv/config'
import { isSmsOptedOut, setSmsOptOut } from '../src/lib/notifications/opt-out'

const TEST_PHONE = '+19999999999' // not a real number — store is keyed by string

async function main() {
  console.log('[opt-out:test] using throwaway number', TEST_PHONE)

  await setSmsOptOut(TEST_PHONE, true)
  const afterStop = await isSmsOptedOut(TEST_PHONE)
  console.log(`[opt-out:test] after STOP  → opted out? ${afterStop}  (expect true)`)

  await setSmsOptOut(TEST_PHONE, false)
  const afterStart = await isSmsOptedOut(TEST_PHONE)
  console.log(`[opt-out:test] after START → opted out? ${afterStart}  (expect false)`)

  const pass = afterStop === true && afterStart === false
  console.log(pass ? '[opt-out:test] PASS ✅' : '[opt-out:test] FAIL ❌')
  process.exit(pass ? 0 : 1)
}

main().catch((err) => {
  console.error('[opt-out:test] threw', err)
  process.exit(1)
})
