// Append-only consent logging — proof of who agreed to what, when, under which
// policy wording. Best-effort: a logging failure must NEVER block the user's
// action (posting a job, signing up). Cookie/analytics consent is handled
// client-side (see src/components/consent); this is for the form-level grants.

import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { consentRecords } from '@/lib/db/schema'

// Bump when the consent wording materially changes, so we can tell who agreed to
// which version. Keep in sync with the copy shown in the forms + /privacy.
export const CONSENT_POLICY_VERSION = '2026-06-27'

export type ConsentKind = 'terms' | 'data_sharing' | 'sms' | 'marketing'

export async function recordConsents(input: {
  userId?: string | null
  email?: string | null
  source: string
  consents: { kind: ConsentKind; granted: boolean }[]
}): Promise<void> {
  if (input.consents.length === 0) return
  try {
    const h = await headers()
    const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '').trim() || null
    const userAgent = h.get('user-agent') ?? null
    await db.insert(consentRecords).values(
      input.consents.map((c) => ({
        userId: input.userId ?? null,
        email: input.email ?? null,
        kind: c.kind,
        granted: c.granted,
        policyVersion: CONSENT_POLICY_VERSION,
        source: input.source,
        ip,
        userAgent,
      })),
    )
  } catch (err) {
    console.error('[recordConsents] failed (non-fatal)', err)
  }
}
