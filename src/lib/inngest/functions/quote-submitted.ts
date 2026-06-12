// `quote/submitted` — notify the homeowner that a contractor sent them a quote.
// The estimate row + project stage + in-thread system note already happened
// inline in sendEstimate; this job handles the homeowner-facing bell/push/email
// and the live quotes-page badge.

import { eq } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contacts, contractors, estimates, homeowners, projects } from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'
import { broadcastUserEvent } from '@/lib/realtime/user-events'
import { formatCurrency } from '@/lib/format'

export const quoteSubmitted = inngest.createFunction(
  {
    id: 'quote-submitted',
    name: 'Notify homeowner of a new quote',
    triggers: [{ event: INNGEST_EVENTS.QUOTE_SUBMITTED }],
  },
  async ({ event, step }) => {
    const estimateId = event.data.estimateId as string | undefined
    if (!estimateId) return { ok: false, reason: 'missing estimateId' }

    await step.run('notify-homeowner', async () => {
      const [row] = await db
        .select({
          total: estimates.total,
          companyName: contractors.companyName,
          homeownerUserId: homeowners.userId,
        })
        .from(estimates)
        .innerJoin(projects, eq(projects.id, estimates.projectId))
        .innerJoin(contractors, eq(contractors.id, projects.contractorId))
        .innerJoin(contacts, eq(contacts.id, projects.contactId))
        .innerJoin(homeowners, eq(homeowners.id, contacts.homeownerId))
        .where(eq(estimates.id, estimateId))
        .limit(1)
      if (!row?.homeownerUserId) return

      const companyName = row.companyName ?? 'A contractor'
      const amount = row.total ? formatCurrency(row.total) : 'a quote'

      await broadcastUserEvent(row.homeownerUserId, 'quote:new', { estimateId })
      await sendNotification({
        userId: row.homeownerUserId,
        type: 'ESTIMATE',
        title: `${companyName} sent you a quote`,
        body: `${companyName} quoted ${amount} for your request. Review and compare it in your dashboard.`,
        actionUrl: '/homeowner/quotes',
        entityType: 'ESTIMATE',
        entityId: estimateId,
        dedupKey: `quote_submitted:${estimateId}`,
      })
    })

    return { ok: true, estimateId }
  },
)
