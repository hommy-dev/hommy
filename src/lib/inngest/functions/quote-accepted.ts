// `quote/accepted` — fan out the win. The charge, award, and stage changes
// already happened inline in acceptEstimate; this job notifies the winning
// company ("you won") and the contractors who lost the lead ("not selected").

import { and, eq, inArray } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractorMembers, leadRecipients } from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'
import { broadcastUserEventToMany } from '@/lib/realtime/user-events'

async function activeMemberIds(contractorIds: string[]): Promise<string[]> {
  if (contractorIds.length === 0) return []
  const rows = await db
    .select({ userId: contractorMembers.userId })
    .from(contractorMembers)
    .where(and(inArray(contractorMembers.contractorId, contractorIds), eq(contractorMembers.status, 'active')))
  return [...new Set(rows.map((r) => r.userId))]
}

export const quoteAccepted = inngest.createFunction(
  {
    id: 'quote-accepted',
    name: 'Notify contractors of an accepted quote',
    triggers: [{ event: INNGEST_EVENTS.QUOTE_ACCEPTED }],
  },
  async ({ event, step }) => {
    const estimateId = event.data.estimateId as string | undefined
    const leadId = event.data.leadId as string | undefined
    const winnerContractorId = event.data.winnerContractorId as string | undefined
    if (!leadId || !winnerContractorId) return { ok: false, reason: 'missing event data' }

    await step.run('notify-winner', async () => {
      const winners = await activeMemberIds([winnerContractorId])
      if (winners.length === 0) return
      await broadcastUserEventToMany(winners, 'quote:accepted', { estimateId: estimateId ?? '' })
      await Promise.all(
        winners.map((userId) =>
          sendNotification({
            userId,
            type: 'ESTIMATE',
            title: 'You won the job! 🎉',
            body: 'The homeowner accepted your quote. Open the job to get started.',
            actionUrl: '/contractor/jobs',
            entityType: 'ESTIMATE',
            entityId: estimateId,
            sendSms: true,
            dedupKey: `quote_won:${leadId}:${winnerContractorId}`,
          }).catch((err) => console.error('[quote-accepted] winner notify', { userId, err })),
        ),
      )
    })

    await step.run('notify-losers', async () => {
      const losers = await db
        .select({ contractorId: leadRecipients.contractorId })
        .from(leadRecipients)
        .where(and(eq(leadRecipients.leadId, leadId), eq(leadRecipients.status, 'lost')))
      const loserMembers = await activeMemberIds(losers.map((l) => l.contractorId))
      if (loserMembers.length === 0) return
      await broadcastUserEventToMany(loserMembers, 'lead:updated', { leadId })
      await Promise.all(
        loserMembers.map((userId) =>
          sendNotification({
            userId,
            type: 'LEAD',
            title: 'Lead closed',
            body: 'The homeowner hired another contractor for this lead.',
            actionUrl: '/contractor/jobs',
            entityType: 'LEAD',
            entityId: leadId,
            dedupKey: `lead_lost:${leadId}:${userId}`,
          }).catch((err) => console.error('[quote-accepted] loser notify', { userId, err })),
        ),
      )
    })

    return { ok: true, leadId }
  },
)
