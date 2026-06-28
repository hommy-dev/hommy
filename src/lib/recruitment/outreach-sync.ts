// Export verified prospects to the cold-email tool. Selects prospects that have
// a verified email, aren't suppressed, and haven't been exported, mints a signed
// claim link for each, pushes them to the tool, and marks them `exported`.
// Hard gates here are the compliance backbone — we never send to an unverified
// or opted-out address.

import { and, asc, eq, gte, inArray, isNotNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorProspects } from '@/lib/db/schema'
import { isEmailOptedOut } from '@/lib/notifications/opt-out'
import { mintInviteToken } from '@/lib/recruitment/invite'
import { addOutreachLead, outreachConfigured } from '@/lib/recruitment/outreach-adapter'
import { MIN_EMAIL_CONFIDENCE, OUTREACH_EXPORT_BATCH } from '@/lib/config/recruitment'

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

export type ExportResult = { ok: boolean; selected: number; exported: number; reason?: string }

/** Export the next batch of eligible prospects to the cold-email tool. */
export async function exportPendingProspects(): Promise<ExportResult> {
  if (!outreachConfigured()) {
    return { ok: false, selected: 0, exported: 0, reason: 'outreach tool not configured' }
  }

  const candidates = await db
    .select({
      id: contractorProspects.id,
      email: contractorProspects.email,
      companyName: contractorProspects.companyName,
      city: contractorProspects.city,
      state: contractorProspects.state,
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

  let exported = 0
  for (const c of candidates) {
    if (!c.email) continue
    // Final suppression check (belt + suspenders vs the DB filter).
    if (await isEmailOptedOut(c.email)) {
      await db
        .update(contractorProspects)
        .set({ outreachStatus: 'suppressed', updatedAt: new Date() })
        .where(eq(contractorProspects.id, c.id))
      continue
    }
    const token = mintInviteToken(c.id)
    if (!token) return { ok: false, selected: candidates.length, exported, reason: 'UNSUBSCRIBE_SECRET not set' }
    const claimUrl = `${APP_URL}/claim/${token}`

    const res = await addOutreachLead({
      email: c.email,
      companyName: c.companyName,
      city: c.city,
      state: c.state,
      claimUrl,
    })
    if (!res.ok) {
      console.error('[outreach-sync] push failed', { id: c.id, err: res.error })
      continue // leave pending → retried next run
    }
    await db
      .update(contractorProspects)
      .set({ outreachStatus: 'exported', inviteToken: token, lastOutreachAt: new Date(), updatedAt: new Date() })
      .where(eq(contractorProspects.id, c.id))
    exported++
  }

  return { ok: true, selected: candidates.length, exported }
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
