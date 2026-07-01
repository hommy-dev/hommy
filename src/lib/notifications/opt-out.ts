// SMS opt-out store. A phone that texts STOP is recorded here (via the Twilio
// inbound webhook) so sendNotification skips it; START removes the row. Keyed by
// E.164 phone — callers must normalize before calling.

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { emailOptOuts, smsOptOuts } from '@/lib/db/schema'

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

// ── Email suppression (recruitment outreach) ────────────────────────────────
// An unsubscribe/bounce/complaint records the address here so the recruitment
// engine never re-exports it to the cold-email tool. Always pass a lowercased
// address (use `normalizeEmail`).

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Has this email opted out of (recruitment) email? */
export async function isEmailOptedOut(email: string): Promise<boolean> {
  const e = normalizeEmail(email)
  if (!e) return false
  const [row] = await db
    .select({ id: emailOptOuts.id })
    .from(emailOptOuts)
    .where(eq(emailOptOuts.email, e))
    .limit(1)
  return !!row
}

/**
 * Record an email opt-out (idempotent). `source`: 'unsubscribe' | 'bounce' |
 * 'complaint'. `stream` ('lead' | 'invite') attributes a bounce/complaint to the
 * sending domain so guardrails are computed per-domain; null for unsubscribes or
 * when the origin send can't be resolved.
 */
export async function setEmailOptOut(
  email: string,
  source: string,
  stream?: string | null,
): Promise<void> {
  const e = normalizeEmail(email)
  if (!e) return
  await db
    .insert(emailOptOuts)
    .values({ email: e, source, stream: stream ?? null })
    .onConflictDoNothing({ target: emailOptOuts.email })
}
