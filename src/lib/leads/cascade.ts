// Lead cascade (docs §4.1 step 6). When an offer expires or is declined, offer
// the lead to ONE more eligible contractor that hasn't been offered it yet —
// keeping a rolling set of live offers until N engage or the lead closes.

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadRecipients, leads } from '@/lib/db/schema'
import { findEligibleContractors } from '@/lib/leads/matching'
import { LEAD_SLA } from '@/lib/config/tunables'
import type { Tx } from '@/lib/credits/ledger'

/**
 * Add the next eligible contractor to a lead's offers. No-op (returns null) when
 * the lead isn't open, has no coordinates, or no fresh eligible company remains.
 * Returns the newly-offered contractor id so the caller can notify them.
 */
export async function offerToNextContractor(
  executor: typeof db | Tx,
  leadId: string,
): Promise<string | null> {
  const [lead] = await executor
    .select({ status: leads.status, serviceId: leads.serviceId, lat: leads.lat, lng: leads.lng })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1)
  if (!lead || lead.status !== 'open' || lead.lat == null || lead.lng == null) return null

  const existing = await executor
    .select({ contractorId: leadRecipients.contractorId })
    .from(leadRecipients)
    .where(eq(leadRecipients.leadId, leadId))
  const excludeContractorIds = existing.map((e) => e.contractorId)

  const eligible = await findEligibleContractors(
    { serviceId: lead.serviceId, lat: lead.lat, lng: lead.lng },
    executor,
    { excludeContractorIds, limit: 1 },
  )
  const next = eligible[0]
  if (!next) return null

  await executor.insert(leadRecipients).values({
    leadId,
    contractorId: next.contractorId,
    status: 'offered',
    slaDeadline: new Date(Date.now() + LEAD_SLA.NO_VIEW_HOURS * 60 * 60 * 1000),
  })
  return next.contractorId
}
