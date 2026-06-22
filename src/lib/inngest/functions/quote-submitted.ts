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
import { getProjectConversationId } from '@/lib/messaging/system'
import { formatCurrency } from '@/lib/format'
import { loadQuoteForPdf } from '@/lib/data/quote-pdf-data'
import { renderQuotePdf } from '@/lib/pdf/quote-pdf'
import { uploadBufferToCloudinary } from '@/lib/cloudinary/server-upload'
import { CLOUDINARY_FOLDERS } from '@/lib/cloudinary/config'
import { deriveQuoteNumber } from '@/components/quote/quote-document'

export const quoteSubmitted = inngest.createFunction(
  {
    id: 'quote-submitted',
    name: 'Notify homeowner of a new quote',
    triggers: [{ event: INNGEST_EVENTS.QUOTE_SUBMITTED }],
  },
  async ({ event, step }) => {
    const estimateId = event.data.estimateId as string | undefined
    if (!estimateId) return { ok: false, reason: 'missing estimateId' }

    // Render the branded PDF, store it on the estimate, and (if hosted) hand the
    // URL to the email step so Resend attaches it. Self-contained + fault-tolerant:
    // any failure returns null and the homeowner still gets the notification.
    const pdf = await step.run('generate-quote-pdf', async () => {
      try {
        const loaded = await loadQuoteForPdf(estimateId)
        if (!loaded) return null
        const buffer = await renderQuotePdf(loaded.data)
        const quoteNumber = deriveQuoteNumber(loaded.data.estimateId, loaded.data.issuedAt)
        const url = await uploadBufferToCloudinary(buffer, {
          folder: CLOUDINARY_FOLDERS.documents,
          filename: `${quoteNumber}.pdf`,
          contentType: 'application/pdf',
        })
        if (url) {
          await db.update(estimates).set({ pdfUrl: url }).where(eq(estimates.id, estimateId))
        }
        return url ? { url, quoteNumber } : null
      } catch (err) {
        console.error('[quote-submitted] pdf generation failed', err)
        return null
      }
    })

    await step.run('notify-homeowner', async () => {
      const [row] = await db
        .select({
          total: estimates.total,
          projectId: estimates.projectId,
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
      // Quotes live inside the job's chat now (no separate Quotes page) — deep
      // link straight to the conversation where they can View & Accept.
      const conversationId = await getProjectConversationId(row.projectId)

      await broadcastUserEvent(row.homeownerUserId, 'quote:new', { estimateId })
      await sendNotification({
        userId: row.homeownerUserId,
        type: 'ESTIMATE',
        title: `${companyName} sent you a quote`,
        body: `${companyName} quoted ${amount} for your job. Open the chat to review and accept it.`,
        actionUrl: conversationId ? `/homeowner/messages/${conversationId}` : '/homeowner',
        entityType: 'ESTIMATE',
        entityId: estimateId,
        dedupKey: `quote_submitted:${estimateId}`,
        emailAttachments: pdf
          ? [{ filename: `${pdf.quoteNumber}.pdf`, path: pdf.url }]
          : undefined,
      })
    })

    return { ok: true, estimateId }
  },
)
