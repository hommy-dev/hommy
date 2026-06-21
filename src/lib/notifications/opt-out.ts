// SMS opt-out store. A phone that texts STOP is recorded here (via the Twilio
// inbound webhook) so sendNotification skips it; START removes the row. Keyed by
// E.164 phone — callers must normalize before calling.

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { smsOptOuts } from '@/lib/db/schema'

/** Has this E.164 phone opted out of SMS? */
export async function isSmsOptedOut(phoneE164: string): Promise<boolean> {
  if (!phoneE164) return false
  const [row] = await db
    .select({ id: smsOptOuts.id })
    .from(smsOptOuts)
    .where(eq(smsOptOuts.phone, phoneE164))
    .limit(1)
  return !!row
}

/** Record (STOP) or clear (START) an SMS opt-out for an E.164 phone. */
export async function setSmsOptOut(phoneE164: string, optedOut: boolean): Promise<void> {
  if (!phoneE164) return
  if (optedOut) {
    await db
      .insert(smsOptOuts)
      .values({ phone: phoneE164, source: 'sms_stop' })
      .onConflictDoNothing({ target: smsOptOuts.phone })
  } else {
    await db.delete(smsOptOuts).where(eq(smsOptOuts.phone, phoneE164))
  }
}
