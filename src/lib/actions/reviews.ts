'use server'

// Submit a review via its tokenized link (docs §4.1 step 7). The token is the
// capability — no session needed. Filling the review updates the contractor's
// cached rating + total and records a `review_received` reputation event.

import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { contractors, leads, projects, reviews } from '@/lib/db/schema'
import { getRequiredUser } from '@/lib/auth/session'
import { getHomeownerForUser } from '@/lib/data/homeowner'
import { recordScoreEvent } from '@/lib/reputation/score'
import { reviewScoreDelta } from '@/lib/config/tunables'
import { markReviewMessageSubmitted } from '@/lib/messaging/system'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import type { Tx } from '@/lib/credits/ledger'

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

/** Recompute the contractor's cached rating/count and record the score event. */
async function recomputeRatingAndScore(
  tx: Tx,
  contractorId: string,
  reviewId: string,
  rating: number,
): Promise<void> {
  const [agg] = await tx
    .select({
      avg: sql<string>`coalesce(avg(${reviews.rating}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(
      and(eq(reviews.contractorId, contractorId), isNotNull(reviews.submittedAt), isNotNull(reviews.rating)),
    )
  await tx
    .update(contractors)
    .set({ avgRating: Number(agg.avg).toFixed(2), totalReviews: agg.count })
    .where(eq(contractors.id, contractorId))
  await recordScoreEvent(tx, {
    contractorId,
    kind: 'review_received',
    delta: reviewScoreDelta(rating),
    sourceType: 'review',
    sourceId: reviewId,
  })
}

const projectReviewSchema = z.object({
  projectId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().default(''),
})

/**
 * Authenticated inline review (the in-thread review card + the job sheet). Keyed
 * on the project, not a token — fills the pending review row the 72h job may have
 * created, or creates one if the homeowner reviews before that. One review per
 * project, so this and the email link converge on the same row.
 */
export async function submitProjectReview(input: unknown): Promise<SubmitReviewResult> {
  const parsed = projectReviewSchema.safeParse(input)
  if (!parsed.success) return fail('INVALID_INPUT')
  const { projectId, rating, comment } = parsed.data

  const user = await getRequiredUser('homeowner')
  const ho = await getHomeownerForUser(user.id)
  if (!ho) return fail('NOT_FOUND')

  // The project must be this homeowner's and completed.
  const [project] = await db
    .select({ id: projects.id, contractorId: projects.contractorId, stage: projects.stage })
    .from(projects)
    .innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, projectId), eq(leads.homeownerId, ho.id)))
    .limit(1)
  if (!project) return fail('NOT_FOUND')
  if (project.stage !== 'completed') return fail('NOT_FOUND')

  const [existing] = await db
    .select({ id: reviews.id, submittedAt: reviews.submittedAt })
    .from(reviews)
    .where(eq(reviews.projectId, projectId))
    .limit(1)
  if (existing?.submittedAt) return fail('ALREADY_SUBMITTED')

  let reviewId = ''
  try {
    reviewId = await db.transaction(async (tx) => {
      let id: string
      if (existing) {
        const updated = await tx
          .update(reviews)
          .set({ rating, comment: comment || null, submittedAt: new Date() })
          .where(and(eq(reviews.id, existing.id), sql`${reviews.submittedAt} is null`))
          .returning({ id: reviews.id })
        if (updated.length === 0) throw new AlreadySubmitted()
        id = updated[0].id
      } else {
        const [created] = await tx
          .insert(reviews)
          .values({
            projectId,
            contractorId: project.contractorId,
            reviewerType: 'homeowner',
            reviewerId: ho.id,
            rating,
            comment: comment || null,
            token: randomBytes(24).toString('base64url'),
            submittedAt: new Date(),
          })
          .returning({ id: reviews.id })
        id = created.id
      }
      await recomputeRatingAndScore(tx, project.contractorId, id, rating)
      return id
    })
  } catch (err) {
    if (err instanceof AlreadySubmitted) return fail('ALREADY_SUBMITTED')
    console.error('[submitProjectReview] failed', err)
    return fail('DB_ERROR')
  }

  // Flip the in-thread review card to submitted, then fan out.
  await markReviewMessageSubmitted(projectId, rating).catch(() => {})
  try {
    await inngest.send({
      name: INNGEST_EVENTS.REVIEW_SUBMITTED,
      data: { reviewId, contractorId: project.contractorId },
    })
  } catch (err) {
    console.error('[submitProjectReview] inngest send failed (non-fatal)', err)
  }

  revalidatePath('/contractor/reviews')
  revalidatePath('/homeowner')
  revalidatePath('/homeowner/messages')
  return { ok: true }
}
