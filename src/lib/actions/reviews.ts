'use server'

// Submit a review via its tokenized link (docs §4.1 step 7). The token is the
// capability — no session needed. Filling the review updates the contractor's
// cached rating + total and records a `review_received` reputation event.

import { z } from 'zod'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { contractors, reviews } from '@/lib/db/schema'
import { recordScoreEvent } from '@/lib/reputation/score'
import { reviewScoreDelta } from '@/lib/config/tunables'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'

const inputSchema = z.object({
  token: z.string().min(16),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().default(''),
})

type ReviewError = 'INVALID_INPUT' | 'NOT_FOUND' | 'ALREADY_SUBMITTED' | 'DB_ERROR'
export type SubmitReviewResult = { ok: true } | { ok: false; error: ReviewError; message: string }

const MESSAGES: Record<ReviewError, string> = {
  INVALID_INPUT: 'Please choose a rating from 1 to 5.',
  NOT_FOUND: 'This review link is invalid or has expired.',
  ALREADY_SUBMITTED: 'Thanks — this review was already submitted.',
  DB_ERROR: 'Could not submit your review. Please try again.',
}

const fail = (error: ReviewError): SubmitReviewResult => ({ ok: false, error, message: MESSAGES[error] })

export async function submitReview(input: unknown): Promise<SubmitReviewResult> {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) return fail('INVALID_INPUT')
  const { token, rating, comment } = parsed.data

  const [review] = await db
    .select({ id: reviews.id, contractorId: reviews.contractorId, submittedAt: reviews.submittedAt })
    .from(reviews)
    .where(eq(reviews.token, token))
    .limit(1)
  if (!review) return fail('NOT_FOUND')
  if (review.submittedAt) return fail('ALREADY_SUBMITTED')

  try {
    await db.transaction(async (tx) => {
      // Guard against a double-submit race: only the still-pending row updates.
      const updated = await tx
        .update(reviews)
        .set({ rating, comment: comment || null, submittedAt: new Date() })
        .where(and(eq(reviews.id, review.id), sql`${reviews.submittedAt} is null`))
        .returning({ id: reviews.id })
      if (updated.length === 0) throw new AlreadySubmitted()

      // Recompute the contractor's cached rating + count (includes this row).
      const [agg] = await tx
        .select({
          avg: sql<string>`coalesce(avg(${reviews.rating}), 0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(reviews)
        .where(
          and(
            eq(reviews.contractorId, review.contractorId),
            isNotNull(reviews.submittedAt),
            isNotNull(reviews.rating),
          ),
        )
      await tx
        .update(contractors)
        .set({ avgRating: Number(agg.avg).toFixed(2), totalReviews: agg.count })
        .where(eq(contractors.id, review.contractorId))

      await recordScoreEvent(tx, {
        contractorId: review.contractorId,
        kind: 'review_received',
        delta: reviewScoreDelta(rating),
        sourceType: 'review',
        sourceId: review.id,
      })
    })
  } catch (err) {
    if (err instanceof AlreadySubmitted) return fail('ALREADY_SUBMITTED')
    console.error('[submitReview] failed', err)
    return fail('DB_ERROR')
  }

  try {
    await inngest.send({
      name: INNGEST_EVENTS.REVIEW_SUBMITTED,
      data: { reviewId: review.id, contractorId: review.contractorId },
    })
  } catch (err) {
    console.error('[submitReview] inngest send failed (non-fatal)', err)
  }

  revalidatePath('/contractor/reviews')
  return { ok: true }
}

class AlreadySubmitted extends Error {}
