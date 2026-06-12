// `review/submitted` — tell the reviewed company's members a new review landed.
// The rating + cached score update already happened inline in submitReview.

import { and, eq } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractorMembers, reviews } from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'

export const reviewSubmitted = inngest.createFunction(
  {
    id: 'review-submitted',
    name: 'Notify company of a new review',
    triggers: [{ event: INNGEST_EVENTS.REVIEW_SUBMITTED }],
  },
  async ({ event, step }) => {
    const reviewId = event.data.reviewId as string | undefined
    const contractorId = event.data.contractorId as string | undefined
    if (!reviewId || !contractorId) return { ok: false, reason: 'missing event data' }

    await step.run('notify-members', async () => {
      const [review] = await db
        .select({ rating: reviews.rating })
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1)
      if (!review) return

      const members = await db
        .select({ userId: contractorMembers.userId })
        .from(contractorMembers)
        .where(and(eq(contractorMembers.contractorId, contractorId), eq(contractorMembers.status, 'active')))
      const userIds = [...new Set(members.map((m) => m.userId))]

      const stars = review.rating ?? 0
      await Promise.all(
        userIds.map((userId) =>
          sendNotification({
            userId,
            type: 'REVIEW',
            title: `New ${stars}★ review`,
            body: 'A homeowner just reviewed your work. See it on your reviews page.',
            actionUrl: '/contractor/reviews',
            entityType: 'REVIEW',
            entityId: reviewId,
            dedupKey: `review_submitted:${reviewId}:${userId}`,
          }).catch((err) => console.error('[review-submitted] notify', { userId, err })),
        ),
      )
    })

    return { ok: true, reviewId }
  },
)
