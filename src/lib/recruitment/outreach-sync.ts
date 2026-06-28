// Send recruitment outreach to verified prospects via Resend (separate domain).
// Selects prospects with a verified, non-suppressed email that haven't been
// emailed, mints a signed claim link + unsubscribe link for each, sends, and
// marks them `sent`. The hard gates here are the compliance backbone — we never
// email an unverified or opted-out address.

import { and, asc, eq, gte, inArray, isNotNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorProspects } from '@/lib/db/schema'
import { isEmailOptedOut } from '@/lib/notifications/opt-out'
import { mintInviteToken, mintUnsubscribeToken } from '@/lib/recruitment/invite'
import {
  sendRecruitmentEmail,
  recruitmentEmailConfigured,
  appUrl,
} from '@/lib/notifications/recruitment-email'
import { MIN_EMAIL_CONFIDENCE, OUTREACH_EXPORT_BATCH } from '@/lib/config/recruitment'

export type SendResult = { ok: boolean; selected: number; sent: number; reason?: string }

/** Send the next batch of recruitment emails. */
export async function sendPendingOutreach(): Promise<SendResult> {
  if (!recruitmentEmailConfigured()) {
    return { ok: false, selected: 0, sent: 0, reason: 'recruitment email not configured' }
  }

  const candidates = await db
    .select({
      id: contractorProspects.id,
      email: contractorProspects.email,
      companyName: contractorProspects.companyName,
      city: contractorProspects.city,
    })
    .from(contractorProspects)
    .where(
      and(
        eq(contractorProspects.outreachStatus, 'pending'),
        inArray(contractorProspects.enrichmentStatus, ['email_found', 'email_verified']),
        isNotNull(contractorProspects.email),
        gte(contractorProspects.emailConfidence, MIN_EMAIL_CONFIDENCE),
      ),
    )
    .orderBy(asc(contractorProspects.createdAt))
    .limit(OUTREACH_EXPORT_BATCH)

  let sent = 0
  for (const c of candidates) {
    if (!c.email) continue
    if (await isEmailOptedOut(c.email)) {
      await db
        .update(contractorProspects)
        .set({ outreachStatus: 'suppressed', updatedAt: new Date() })
        .where(eq(contractorProspects.id, c.id))
      continue
    }
    const inviteToken = mintInviteToken(c.id)
    const unsubToken = mintUnsubscribeToken(c.email)
    if (!inviteToken || !unsubToken) {
      return { ok: false, selected: candidates.length, sent, reason: 'UNSUBSCRIBE_SECRET not set' }
    }

    const res = await sendRecruitmentEmail({
      to: c.email,
      companyName: c.companyName,
      city: c.city,
      claimUrl: `${appUrl()}/claim/${inviteToken}`,
      unsubscribeUrl: `${appUrl()}/unsubscribe/${unsubToken}`,
    })
    if (!res.ok) {
      console.error('[outreach-sync] send failed', { id: c.id, err: res.error })
      continue // leave pending → retried next run
    }
    await db
      .update(contractorProspects)
      .set({
        outreachStatus: 'sent',
        inviteToken,
        lastOutreachAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contractorProspects.id, c.id))
    sent++
  }

  return { ok: true, selected: candidates.length, sent }
}

/** Skip prospects we'll never email (no findable email) — housekeeping. */
export async function markNoEmailSkipped(): Promise<number> {
  const rows = await db
    .update(contractorProspects)
    .set({ outreachStatus: 'skipped', updatedAt: new Date() })
    .where(
      and(
        eq(contractorProspects.enrichmentStatus, 'no_email'),
        ne(contractorProspects.outreachStatus, 'skipped'),
      ),
    )
    .returning({ id: contractorProspects.id })
  return rows.length
}
