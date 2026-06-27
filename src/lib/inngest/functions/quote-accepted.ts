// `quote/accepted` — fan out the win. The charge, award, and stage changes
// already happened inline in acceptEstimate; this job notifies the winning
// company ("you won") and the contractors who lost the lead ("not selected").

import { and, eq, inArray } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractorMembers, contractors, homeowners, leadRecipients, leads, projects, users } from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'
import { broadcastUserEventToMany } from '@/lib/realtime/user-events'
import { getProjectConversationId, postSystemMessage } from '@/lib/messaging/system'

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
    const projectId = event.data.projectId as string | undefined
    if (!leadId || !winnerContractorId) return { ok: false, reason: 'missing event data' }

    await step.run('notify-homeowner', async () => {
      const [row] = await db
        .select({ homeownerUserId: users.id, companyName: contractors.companyName })
        .from(leads)
        .innerJoin(homeowners, eq(homeowners.id, leads.homeownerId))
        .innerJoin(users, eq(users.id, homeowners.userId))
        .innerJoin(contractors, eq(contractors.id, winnerContractorId))
        .where(eq(leads.id, leadId))
        .limit(1)
      if (!row) return
      const conversationId = projectId ? await getProjectConversationId(projectId) : null
      await sendNotification({
        userId: row.homeownerUserId,
        type: 'ESTIMATE',
        title: 'You’re hired. Quote accepted',
        body: `You accepted ${row.companyName ?? 'your contractor'}’s quote. They’ll be in touch to schedule the work.`,
        actionUrl: conversationId ? `/homeowner/messages/${conversationId}` : '/homeowner',
        entityType: 'ESTIMATE',
        entityId: estimateId,
        dedupKey: `quote_accepted_homeowner:${estimateId ?? leadId}`,
      }).catch((err) => console.error('[quote-accepted] homeowner notify', err))
    })

    const creditsCharged = event.data.creditsCharged as number | undefined
    const winnerBalanceAfter = event.data.winnerBalanceAfter as number | undefined

    await step.run('notify-winner', async () => {
      const winners = await activeMemberIds([winnerContractorId])
      if (winners.length === 0) return
      await broadcastUserEventToMany(winners, 'quote:accepted', { estimateId: estimateId ?? '' })

      // Surface the win-fee charge + new balance so the deduction is never a
      // mystery. Falls back to plain copy for older events without the amounts.
      let body = 'The homeowner accepted your quote. Open the job to get started.'
      if (typeof creditsCharged === 'number') {
        const fee = `Win fee: ${creditsCharged} credit${creditsCharged === 1 ? '' : 's'}`
        const wallet =
          typeof winnerBalanceAfter === 'number'
            ? winnerBalanceAfter < 0
              ? ` · you owe ${Math.abs(winnerBalanceAfter)}. Top up to take new leads`
              : ` · ${winnerBalanceAfter} left`
            : ''
        body = `The homeowner accepted your quote. ${fee}${wallet}. Open the job to get started.`
      }

      await Promise.all(
        winners.map((userId) =>
          sendNotification({
            userId,
            type: 'ESTIMATE',
            title: 'You won the job! 🎉',
            body,
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

    // Post the "another contractor was selected" notice into each losing project's
    // chat. Unbounded fan-out (no engage cap), so it lives here off the homeowner's
    // accept click. Loser projects were set to stage='lost' inline by acceptEstimate.
    await step.run('post-loser-chat-messages', async () => {
      const loserProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.leadId, leadId), eq(projects.stage, 'lost')))
      await Promise.all(
        loserProjects.map(async (p) => {
          const convo = await getProjectConversationId(p.id)
          if (convo) {
            await postSystemMessage(convo, 'The homeowner accepted another contractor’s quote.').catch(
              (err) => console.error('[quote-accepted] loser chat msg', { projectId: p.id, err }),
            )
          }
        }),
      )
    })

    return { ok: true, leadId }
  },
)
