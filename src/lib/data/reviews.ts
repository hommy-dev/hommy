// Reads for reviews: the public token view (the /review/[token] page) and the
// contractor's reviews dashboard. NOT cached — small and changes on submit.

import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contractors,
  homeowners,
  leads,
  projects,
  reviews,
  services,
  users,
} from '@/lib/db/schema'
import { subtypeLabel } from '@/lib/leads/subtype'

export type ReviewTokenView = {
  reviewId: string
  submitted: boolean
  contractorName: string | null
  serviceName: string
  subtype: string | null
}

export async function getReviewByToken(token: string): Promise<ReviewTokenView | null> {
  if (!token || token.length < 16) return null
  const [row] = await db
    .select({
      reviewId: reviews.id,
      submittedAt: reviews.submittedAt,
      contractorName: contractors.companyName,
      serviceName: services.name,
      serviceDetails: leads.serviceDetails,
    })
    .from(reviews)
    .innerJoin(projects, eq(projects.id, reviews.projectId))
    .innerJoin(contractors, eq(contractors.id, reviews.contractorId))
    .innerJoin(services, eq(services.id, projects.serviceId))
    .leftJoin(leads, eq(leads.id, projects.leadId))
    .where(eq(reviews.token, token))
    .limit(1)
  if (!row) return null

  return {
    reviewId: row.reviewId,
    submitted: row.submittedAt !== null,
    contractorName: row.contractorName,
    serviceName: row.serviceName,
    subtype: subtypeLabel(row.serviceDetails ?? {}),
  }
}

export type ContractorReview = {
  id: string
  rating: number
  comment: string | null
  reviewerName: string | null
  submittedAt: Date
  /** Where the review came from. Native Hommy reviews vs imported Google ones.
   *  Optional for back-compat — existing builders default to 'hommy'. */
  source?: 'hommy' | 'google'
  /** Reviewer photo (Google reviews carry one; Hommy reviews don't). */
  authorPhotoUrl?: string | null
  /** Link back to the source review/listing — attribution for imported reviews. */
  sourceUrl?: string | null
}

export type ReviewsSummary = {
  avgRating: number | null
  total: number
  /** counts keyed by star (1..5). */
  distribution: Record<number, number>
  reviews: ContractorReview[]
}

export async function getContractorReviews(contractorId: string): Promise<ReviewsSummary> {
  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      reviewerName: users.fullName,
      submittedAt: reviews.submittedAt,
    })
    .from(reviews)
    .leftJoin(homeowners, eq(homeowners.id, reviews.reviewerId))
    .leftJoin(users, eq(users.id, homeowners.userId))
    .where(and(eq(reviews.contractorId, contractorId), isNotNull(reviews.submittedAt), isNotNull(reviews.rating)))
    .orderBy(desc(reviews.submittedAt))

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0
  const list: ContractorReview[] = []
  for (const r of rows) {
    const rating = r.rating ?? 0
    if (rating >= 1 && rating <= 5) distribution[rating] += 1
    sum += rating
    list.push({
      id: r.id,
      rating,
      comment: r.comment,
      reviewerName: r.reviewerName,
      submittedAt: r.submittedAt as Date,
      source: 'hommy',
    })
  }

  return {
    avgRating: list.length > 0 ? sum / list.length : null,
    total: list.length,
    distribution,
    reviews: list,
  }
}
