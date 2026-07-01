// Daily stale-lead expiry. An awaiting-coverage lead never auto-expires (the SLA
// cron deliberately skips them), so without this a homeowner in an area we can't
// staff could wait forever on "we're matching you." After RECRUIT_LEAD_EXPIRE_DAYS
// with no roofer, we honestly close the request and tell the homeowner the truth
// plus next steps — no leak of platform size, just an honest update.
//
// Gated behind RECRUITMENT_SWEEP_ENABLED. Runs before the 13:00 lead catch-up;
// the expiry window (30d) is well past the catch-up window (21d) so they never
// act on the same lead.

import { and, eq, lt } from 'drizzle-orm'
import { inngest } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { homeowners, leads } from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'
import { RECRUIT_LEAD_EXPIRE_DAYS } from '@/lib/config/recruitment'

export const leadCoverageExpiry = inngest.createFunction(
  {
    id: 'lead-coverage-expiry',
    name: 'Expire long-uncovered leads + honestly notify the homeowner',
    triggers: [{ cron: '0 4 * * *' }],
    retries: 1,
  },
  async ({ step }) => {
    if (process.env.RECRUITMENT_SWEEP_ENABLED !== 'true') {
      return { ok: true, skipped: 'sweep disabled' }
    }

    const cutoff = new Date(Date.now() - RECRUIT_LEAD_EXPIRE_DAYS * 24 * 60 * 60 * 1000)

    const stale = await step.run('find-stale', async () =>
      db
        .select({ id: leads.id, homeownerUserId: homeowners.userId })
        .from(leads)
        .innerJoin(homeowners, eq(homeowners.id, leads.homeownerId))
        .where(and(eq(leads.status, 'open'), eq(leads.awaitingCoverage, true), lt(leads.createdAt, cutoff)))
        .limit(200),
    )

    if (stale.length === 0) return { ok: true, expired: 0 }

    const expired = await step.run('expire-and-notify', async () => {
      let n = 0
      for (const lead of stale) {
        // Expire (guarded so a concurrent match/close is a no-op).
        const updated = await db
          .update(leads)
          .set({ status: 'expired', awaitingCoverage: false, closedAt: new Date() })
          .where(and(eq(leads.id, lead.id), eq(leads.status, 'open'), eq(leads.awaitingCoverage, true)))
          .returning({ id: leads.id })
        if (updated.length === 0) continue
        await sendNotification({
          userId: lead.homeownerUserId,
          type: 'LEAD',
          title: 'Update on your roofing request',
          body: "We weren't able to match a roofer in your area just yet, so we've closed this request for now. You can repost anytime — we're always adding roofers near you and will get to you the moment one's available.",
          actionUrl: '/homeowner',
          entityType: 'LEAD',
          entityId: lead.id,
          dedupKey: `coverage_expired:${lead.id}`,
        }).catch((err) => console.error('[lead-coverage-expiry] notify', err))
        n += 1
      }
      return n
    })

    return { ok: true, expired }
  },
)
