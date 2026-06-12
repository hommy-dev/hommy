// `review/request.scheduled` — after a project is marked `completed`, wait the
// configured window, then create a pending review row + email the homeowner a
// tokenized link (docs §4.1 step 7 / §10). Idempotent: skips if the project was
// reverted or a review already exists.

import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contacts, contractors, homeowners, projects, reviews } from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'
import { REVIEW_REQUEST_DELAY_HOURS } from '@/lib/config/tunables'

export const reviewRequest = inngest.createFunction(
  {
    id: 'review-request',
    name: 'Request a review after a completed job',
    triggers: [{ event: INNGEST_EVENTS.REVIEW_REQUEST_SCHEDULED }],
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId as string | undefined
    if (!projectId) return { ok: false, reason: 'missing projectId' }

    await step.sleep('wait-before-review', `${REVIEW_REQUEST_DELAY_HOURS}h`)

    await step.run('create-and-send', async () => {
      const [project] = await db
        .select({ stage: projects.stage, contractorId: projects.contractorId, contactId: projects.contactId })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)
      if (!project || project.stage !== 'completed') return // reverted — no review

      const [existing] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(eq(reviews.projectId, projectId))
        .limit(1)
      if (existing) return // already requested

      const [contact] = await db
        .select({ homeownerId: contacts.homeownerId })
        .from(contacts)
        .where(eq(contacts.id, project.contactId))
        .limit(1)
      if (!contact) return
      const [homeowner] = await db
        .select({ id: homeowners.id, userId: homeowners.userId })
        .from(homeowners)
        .where(eq(homeowners.id, contact.homeownerId))
        .limit(1)
      if (!homeowner) return
      const [company] = await db
        .select({ name: contractors.companyName })
        .from(contractors)
        .where(eq(contractors.id, project.contractorId))
        .limit(1)
      const companyName = company?.name ?? 'your contractor'

      const token = randomBytes(24).toString('base64url')
      await db.insert(reviews).values({
        projectId,
        contractorId: project.contractorId,
        reviewerType: 'homeowner',
        reviewerId: homeowner.id,
        token,
      })

      await sendNotification({
        userId: homeowner.userId,
        type: 'REVIEW',
        title: `How was ${companyName}?`,
        body: 'Leave a quick review of the work — it helps other homeowners choose.',
        actionUrl: `/review/${token}`,
        entityType: 'REVIEW',
        entityId: projectId,
        dedupKey: `review_request:${projectId}`,
      })
    })

    return { ok: true, projectId }
  },
)
