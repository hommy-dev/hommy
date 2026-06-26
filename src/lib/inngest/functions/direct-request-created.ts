// `lead/direct-request.created` — async notification for a DIRECT hire request.
//
// Unlike lead-created (broadcast to many matched companies), a direct request
// targets exactly ONE chosen contractor. The lead + recipient + project +
// conversation are already created inline in requestDirectQuote; this job just
// pings every active member of that one company so they know a homeowner picked
// them specifically. A direct request is the highest-intent lead, so the copy
// leans into that.

import { and, eq, inArray } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractorMembers, leads, services } from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'
import { broadcastUserEventToMany } from '@/lib/realtime/user-events'

export const directRequestCreated = inngest.createFunction(
  {
    id: 'direct-request-created',
    name: 'Notify a contractor of a direct hire request',
    triggers: [{ event: INNGEST_EVENTS.DIRECT_REQUEST_CREATED }],
  },
  async ({ event, step }) => {
    const leadId = event.data.leadId as string | undefined
    const contractorId = event.data.contractorId as string | undefined
    if (!leadId || !contractorId) return { ok: false, reason: 'missing leadId/contractorId' }

    const notified = await step.run('notify-target-members', async () => {
      const [lead] = await db
        .select({ city: leads.city, state: leads.state, serviceName: services.name })
        .from(leads)
        .innerJoin(services, eq(leads.serviceId, services.id))
        .where(eq(leads.id, leadId))
        .limit(1)
      if (!lead) return 0

      const members = await db
        .select({ userId: contractorMembers.userId })
        .from(contractorMembers)
        .where(
          and(
            inArray(contractorMembers.contractorId, [contractorId]),
            eq(contractorMembers.status, 'active'),
          ),
        )
      if (members.length === 0) return 0

      const userIds = [...new Set(members.map((m) => m.userId))]
      const where = [lead.city, lead.state].filter(Boolean).join(', ')
      const body = where
        ? `A homeowner in ${where} asked you directly for a ${lead.serviceName} quote.`
        : `A homeowner asked you directly for a ${lead.serviceName} quote.`

      // Live inbox refresh for anyone with the dashboard open.
      await broadcastUserEventToMany(userIds, 'lead:new', { leadId })

      await Promise.all(
        userIds.map((userId) =>
          sendNotification({
            userId,
            type: 'LEAD',
            title: 'Direct request for you',
            body,
            actionUrl: '/contractor/jobs',
            entityType: 'LEAD',
            entityId: leadId,
            dedupKey: `direct_request:${leadId}:${userId}`,
            sendSms: false,
          }).catch((err) => console.error('[direct-request-created] notify error', { userId, err })),
        ),
      )

      return userIds.length
    })

    return { ok: true, leadId, notified }
  },
)
