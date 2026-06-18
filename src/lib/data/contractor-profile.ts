// Public-facing contractor profile — the decision info a homeowner sees about a
// company (rating, reviews, verification, experience, responsiveness, bio). Used
// by the "View profile" dialog in the homeowner's job sheet + chat detail.

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors } from '@/lib/db/schema'
import { getContractorReviews, type ContractorReview } from '@/lib/data/reviews'

export type ContractorPublicProfile = {
  id: string
  companyName: string | null
  bio: string | null
  logoUrl: string | null
  yearsInBusiness: number | null
  verified: boolean
  avgRating: number | null
  totalReviews: number
  avgResponseTimeMinutes: number | null
  reviews: ContractorReview[]
}

export async function getContractorPublicProfile(
  contractorId: string,
): Promise<ContractorPublicProfile | null> {
  const [c] = await db
    .select({
      id: contractors.id,
      companyName: contractors.companyName,
      bio: contractors.bio,
      logoUrl: contractors.logoUrl,
      yearsInBusiness: contractors.yearsInBusiness,
      verificationStatus: contractors.verificationStatus,
      avgResponseTimeMinutes: contractors.avgResponseTimeMinutes,
    })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1)
  if (!c) return null

  // Live review summary (accurate vs the cached avg) — keep the 6 most recent.
  const summary = await getContractorReviews(contractorId)

  return {
    id: c.id,
    companyName: c.companyName,
    bio: c.bio,
    logoUrl: c.logoUrl,
    yearsInBusiness: c.yearsInBusiness,
    verified: c.verificationStatus === 'verified',
    avgRating: summary.avgRating,
    totalReviews: summary.total,
    avgResponseTimeMinutes: c.avgResponseTimeMinutes,
    reviews: summary.reviews.slice(0, 6),
  }
}
