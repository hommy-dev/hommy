// `lead/created` — async notification fan-out for a freshly posted lead.
//
// The matching + lead_recipients insert already happened INLINE in the
// createLead action (so the lead is visible in the contractor inbox the instant
// it's posted, with no dependency on the Inngest dev server). This job handles
// the async side: for every active member of each matched company we
//   1. broadcast `lead:new` → their open dashboard refreshes the leads inbox, and
//   2. sendNotification(...) → bell row + toast + web push + email (+ SMS if the
//      lead is an emergency), all through the one notification core.

import { and, eq, inArray } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractorMembers, leadRecipients, leads, services } from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'
import { broadcastUserEventToMany } from '@/lib/realtime/user-events'

export const leadCreated = inngest.createFunction(
  {
    id: 'lead-created',
    name: 'Notify matched contractors of a new lead',
    triggers: [{ event: INNGEST_EVENTS.LEAD_CREATED }],
  },
  async ({ event, step }) => {
    const leadId = event.data.leadId as string | undefined
    if (!leadId) return { ok: false, reason: 'missing leadId' }

    const notified = await step.run('notify-matched-members', async () => {
      const [lead] = await db
        .select({
          id: leads.id,
          city: leads.city,
          state: leads.state,
          urgency: leads.urgency,
          serviceName: services.name,
        })
        .from(leads)
        .innerJoin(services, eq(leads.serviceId, services.id))
        .where(eq(leads.id, leadId))
        .limit(1)
      if (!lead) return 0

      // Companies this lead was offered to.
      const recipients = await db
        .select({ contractorId: leadRecipients.contractorId })
        .from(leadRecipients)
        .where(eq(leadRecipients.leadId, leadId))
      if (recipients.length === 0) return 0

      const contractorIds = recipients.map((r) => r.contractorId)

      // Every active member of those companies.
      const members = await db
        .select({ userId: contractorMembers.userId })
        .from(contractorMembers)
        .where(
          and(
            inArray(contractorMembers.contractorId, contractorIds),
            eq(contractorMembers.status, 'active'),
          ),
        )
      if (members.length === 0) return 0

      const userIds = [...new Set(members.map((m) => m.userId))]
      const where = [lead.city, lead.state].filter(Boolean).join(', ')
      const body = where
        ? `A new ${lead.serviceName} request in ${where}.`
        : `A new ${lead.serviceName} request near you.`
      const isEmergency = lead.urgency === 'emergency'

      // Live inbox refresh for anyone with the dashboard open.
      await broadcastUserEventToMany(userIds, 'lead:new', { leadId })

      // Bell + toast + push + email (+ SMS for emergencies). dedupKey makes a
      // job retry a no-op per member.
      await Promise.all(
        userIds.map((userId) =>
          sendNotification({
            userId,
            type: 'LEAD',
            title: isEmergency ? 'Emergency lead in your area' : 'New lead in your area',
            body,
            actionUrl: '/contractor/leads',
            entityType: 'LEAD',
            entityId: leadId,
            dedupKey: `lead_offer:${leadId}:${userId}`,
            sendSms: isEmergency,
          }).catch((err) => console.error('[lead-created] notify error', { userId, err })),
        ),
      )

      return userIds.length
    })

    return { ok: true, leadId, notified }
  },
)
