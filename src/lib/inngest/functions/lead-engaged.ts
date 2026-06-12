// `lead/engaged` — async comms after a contractor engages a lead.
//
// The credit charge + project/contact/conversation creation already happened
// INLINE in the engageLead action (so the contractor's CRM updates instantly).
// This job only handles the homeowner-facing side: notify them a contractor is
// interested and wake their open inbox. Mirrors the lead-created split.

import { eq } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractors } from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'
import { broadcastUserEvent } from '@/lib/realtime/user-events'

export const leadEngaged = inngest.createFunction(
  {
    id: 'lead-engaged',
    name: 'Notify homeowner a contractor engaged',
    triggers: [{ event: INNGEST_EVENTS.LEAD_ENGAGED }],
  },
  async ({ event, step }) => {
    const leadId = event.data.leadId as string | undefined
    const contractorId = event.data.contractorId as string | undefined
    const conversationId = event.data.conversationId as string | undefined
    const homeownerUserId = event.data.homeownerUserId as string | undefined
    if (!leadId || !contractorId || !conversationId || !homeownerUserId) {
      return { ok: false, reason: 'missing event data' }
    }

    await step.run('notify-homeowner', async () => {
      const [company] = await db
        .select({ name: contractors.companyName })
        .from(contractors)
        .where(eq(contractors.id, contractorId))
        .limit(1)
      const companyName = company?.name ?? 'A contractor'

      // Wake the homeowner's open inbox if any.
      await broadcastUserEvent(homeownerUserId, 'message:new', { conversationId })

      // Bell + push + email (dedupKey makes a job retry a no-op).
      await sendNotification({
        userId: homeownerUserId,
        type: 'LEAD',
        title: `${companyName} is interested`,
        body: `${companyName} wants to help with your request. Open the conversation to start chatting.`,
        actionUrl: `/homeowner/messages/${conversationId}`,
        entityType: 'LEAD',
        entityId: leadId,
        dedupKey: `lead_engaged:${leadId}:${contractorId}`,
      })
    })

    return { ok: true, leadId, contractorId }
  },
)
