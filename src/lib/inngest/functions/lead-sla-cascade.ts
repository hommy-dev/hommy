// `lead/recipient.sla` cascade — runs on a schedule (docs §4.1 step 6 / §10).
// Expires offers that passed their SLA deadline without engaging, decays the
// quiet contractor's score, and offers the lead to one more eligible company —
// keeping the pipeline alive until N engage or the lead closes.

import { and, eq, inArray, lt } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { leadRecipients, leads } from '@/lib/db/schema'
import { recordScoreEvent } from '@/lib/reputation/score'
import { SCORE_DELTAS } from '@/lib/config/tunables'
import { offerToNextContractor } from '@/lib/leads/cascade'

export const leadSlaCascade = inngest.createFunction(
  {
    id: 'lead-sla-cascade',
    name: 'Expire quiet lead offers and cascade',
    triggers: [{ cron: '*/15 * * * *' }],
  },
  async () => {
    const now = new Date()

    // Live offers past their deadline, on leads still open.
    const expired = await db
      .select({
        id: leadRecipients.id,
        leadId: leadRecipients.leadId,
        status: leadRecipients.status,
      })
      .from(leadRecipients)
      .innerJoin(leads, eq(leads.id, leadRecipients.leadId))
      .where(
        and(
          inArray(leadRecipients.status, ['offered', 'viewed']),
          lt(leadRecipients.slaDeadline, now),
          eq(leads.status, 'open'),
        ),
      )
      .limit(100)

    let cascaded = 0
    for (const row of expired) {
      const newContractorId = await db
        .transaction(async (tx) => {
          // Guard: only flip if still pending (avoids racing an engage).
          const updated = await tx
            .update(leadRecipients)
            .set({ status: 'expired', respondedAt: now })
            .where(
              and(eq(leadRecipients.id, row.id), inArray(leadRecipients.status, ['offered', 'viewed'])),
            )
            .returning({ contractorId: leadRecipients.contractorId })
          if (updated.length === 0) return null

          // Never viewed = ignored; viewed but no action = slow.
          const viewed = row.status === 'viewed'
          await recordScoreEvent(tx, {
            contractorId: updated[0].contractorId,
            kind: viewed ? 'slow_response' : 'lead_ignored_no_reason',
            delta: viewed ? SCORE_DELTAS.slow_response : SCORE_DELTAS.lead_ignored_no_reason,
            sourceType: 'lead',
            sourceId: row.leadId,
          })

          return offerToNextContractor(tx, row.leadId)
        })
        .catch((err) => {
          console.error('[lead-sla-cascade] row failed', { id: row.id, err })
          return null
        })

      if (newContractorId) {
        cascaded += 1
        // Notify the newly-offered company (others are deduped by dedupKey).
        await inngest
          .send({ name: INNGEST_EVENTS.LEAD_CREATED, data: { leadId: row.leadId } })
          .catch((err) => console.error('[lead-sla-cascade] notify failed', err))
      }
    }

    return { ok: true, expired: expired.length, cascaded }
  },
)
