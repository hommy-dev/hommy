// Reads for the integrations feature: the contractor's connected accounts (for
// the settings page) and the imported Google reviews/photos (for the profile).
// NOT cached — small, company-scoped, and changes on connect/refresh.

import { and, count, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  externalMedia,
  externalReviews,
  integrationConnections,
} from '@/lib/db/schema'
import {
  getContractorReviews,
  type ContractorReview,
  type ReviewsSummary,
} from '@/lib/data/reviews'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser, getMembershipRole } from '@/lib/data/dashboard'

export type IntegrationsData = {
  connections: IntegrationConnectionRow[]
  canManage: boolean
}

/** Everything the integrations page's dynamic island needs (auth + company +
 *  connections + role) in one call, so the page can pass an unawaited promise to
 *  the client grid (static cards render instantly; only this state streams). */
export async function getIntegrationsData(): Promise<IntegrationsData> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return { connections: [], canManage: false }
  const [connections, role] = await Promise.all([
    getContractorConnections(contractor.id),
    getMembershipRole(user.id, contractor.id),
  ])
  return { connections, canManage: role === 'owner' || role === 'admin' }
}

export type IntegrationConnectionRow = {
  id: string
  provider: string
  status: (typeof integrationConnections.status.enumValues)[number]
  label: string | null
  externalAccountId: string
  meta: Record<string, unknown>
  lastSyncedAt: Date | null
  lastError: string | null
  reviewCount: number
  mediaCount: number
}

/** Every connected account for a company (settings page). */
export async function getContractorConnections(
  contractorId: string,
): Promise<IntegrationConnectionRow[]> {
  const rows = await db
    .select({
      id: integrationConnections.id,
      provider: integrationConnections.provider,
      status: integrationConnections.status,
      label: integrationConnections.externalAccountLabel,
      externalAccountId: integrationConnections.externalAccountId,
      meta: integrationConnections.externalAccountMeta,
      lastSyncedAt: integrationConnections.lastSyncedAt,
      lastError: integrationConnections.lastError,
    })
    .from(integrationConnections)
    .where(eq(integrationConnections.contractorId, contractorId))
    .orderBy(desc(integrationConnections.createdAt))
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  const [reviewCounts, mediaCounts] = await Promise.all([
    db
      .select({ cid: externalReviews.connectionId, n: count() })
      .from(externalReviews)
      .where(inArray(externalReviews.connectionId, ids))
      .groupBy(externalReviews.connectionId),
    db
      .select({ cid: externalMedia.connectionId, n: count() })
      .from(externalMedia)
      .where(inArray(externalMedia.connectionId, ids))
      .groupBy(externalMedia.connectionId),
  ])
  const reviewMap = new Map(reviewCounts.map((r) => [r.cid, Number(r.n)]))
  const mediaMap = new Map(mediaCounts.map((r) => [r.cid, Number(r.n)]))

  return rows.map((r) => ({
    ...r,
    meta: r.meta ?? {},
    reviewCount: reviewMap.get(r.id) ?? 0,
    mediaCount: mediaMap.get(r.id) ?? 0,
  }))
}

/** Visible imported reviews mapped to the unified profile card shape. */
export async function getExternalReviews(
  contractorId: string,
): Promise<ContractorReview[]> {
  const rows = await db
    .select({
      id: externalReviews.id,
      rating: externalReviews.rating,
      comment: externalReviews.comment,
      authorName: externalReviews.authorName,
      authorPhotoUrl: externalReviews.authorPhotoUrl,
      sourceUrl: externalReviews.sourceUrl,
      postedAt: externalReviews.postedAt,
      importedAt: externalReviews.importedAt,
    })
    .from(externalReviews)
    .where(
      and(
        eq(externalReviews.contractorId, contractorId),
        eq(externalReviews.isVisible, true),
      ),
    )
    .orderBy(desc(externalReviews.postedAt))

  return rows.map((r) => ({
    id: r.id,
    rating: r.rating ?? 0,
    comment: r.comment,
    reviewerName: r.authorName,
    submittedAt: (r.postedAt ?? r.importedAt) as Date,
    source: 'google' as const,
    authorPhotoUrl: r.authorPhotoUrl,
    sourceUrl: r.sourceUrl,
  }))
}

export type ExternalMediaItem = {
  id: string
  sourceUrl: string
  caption: string | null
  attributionHtml: string | null
}

/** Visible imported photos for the profile gallery. */
export async function getExternalMedia(
  contractorId: string,
): Promise<ExternalMediaItem[]> {
  return db
    .select({
      id: externalMedia.id,
      sourceUrl: externalMedia.sourceUrl,
      caption: externalMedia.caption,
      attributionHtml: externalMedia.attributionHtml,
    })
    .from(externalMedia)
    .where(
      and(
        eq(externalMedia.contractorId, contractorId),
        eq(externalMedia.isVisible, true),
      ),
    )
    .orderBy(desc(externalMedia.importedAt))
}

export type CombinedReviews = ReviewsSummary & {
  /** Per-source counts so the summary can show an honest breakdown. */
  hommyCount: number
  googleCount: number
}

/**
 * Native Hommy reviews + imported Google reviews merged into one display
 * summary. The combined average is a true weighted mean of all real ratings;
 * the per-source counts power the "N Hommy · M Google" sub-line. This is
 * DISPLAY-ONLY — the cached `contractors.avg_rating`/`total_reviews` (which
 * drive ranking/score/matching) remain Hommy-only.
 */
export async function getCombinedReviews(
  contractorId: string,
): Promise<CombinedReviews> {
  const [hommy, google] = await Promise.all([
    getContractorReviews(contractorId),
    getExternalReviews(contractorId),
  ])

  const all = [...hommy.reviews, ...google].sort(
    (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
  )

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0
  for (const r of all) {
    if (r.rating >= 1 && r.rating <= 5) distribution[r.rating] += 1
    sum += r.rating
  }

  return {
    avgRating: all.length > 0 ? sum / all.length : null,
    total: all.length,
    distribution,
    reviews: all,
    hommyCount: hommy.total,
    googleCount: google.length,
  }
}
