// Public roofer (contractor) profile read layer for /roofers/[slug] SEO pages.
// Only VERIFIED contractors with a slug are exposed publicly. Cached under the
// `roofers` tag so profile edits / verification changes can bust it.

import { and, eq, isNotNull } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { cacheLife, cacheTag, updateTag } from 'next/cache'
import { db } from '@/lib/db'
import { contractors, cities, states, serviceAreas } from '@/lib/db/schema'
import { getContractorReviews, type ContractorReview } from '@/lib/data/reviews'

/** Invalidate cached roofer-profile data (profile edits, verification changes). */
export function revalidateRoofers(): void {
  updateTag('roofers')
}

export type RooferCity = { name: string; citySlug: string; stateCode: string; stateSlug: string }

export type RooferProfile = {
  id: string
  slug: string
  companyName: string | null
  bio: string | null
  logoUrl: string | null
  bannerUrl: string | null
  yearsInBusiness: number | null
  licenseNumber: string | null
  avgResponseTimeMinutes: number | null
  avgRating: number | null
  totalReviews: number
  reviews: ContractorReview[]
  cities: RooferCity[]
}

/** Resolve a verified roofer by slug (null → 404), with reviews + served cities. */
export async function getRooferBySlug(slug: string): Promise<RooferProfile | null> {
  'use cache'
  cacheLife('standard')
  cacheTag('roofers', `roofer:${slug}`)

  const [c] = await db
    .select({
      id: contractors.id,
      slug: contractors.slug,
      companyName: contractors.companyName,
      bio: contractors.bio,
      logoUrl: contractors.logoUrl,
      bannerUrl: contractors.bannerUrl,
      yearsInBusiness: contractors.yearsInBusiness,
      licenseNumber: contractors.licenseNumber,
      avgResponseTimeMinutes: contractors.avgResponseTimeMinutes,
    })
    .from(contractors)
    .where(and(eq(contractors.slug, slug), eq(contractors.verificationStatus, 'verified')))
    .limit(1)
  if (!c || !c.slug) return null

  // Reviews (Hommy native) — drives display + the AggregateRating schema.
  const summary = await getContractorReviews(c.id)

  // Cities this roofer covers (centroid inside one of its areas) → internal links
  // back to the city pages (hub-and-spoke). Top by population.
  const result = await db.execute(sql`
    SELECT DISTINCT ci.name AS name, ci.slug AS city_slug,
           s.code AS state_code, s.slug AS state_slug, ci.population AS population
    FROM ${cities} ci
    JOIN ${states} s ON s.code = ci.state_code
    JOIN ${serviceAreas} sa ON sa.contractor_id = ${c.id}
    WHERE sa.geom IS NOT NULL
      AND ST_Covers(sa.geom, ST_SetSRID(ST_MakePoint(ci.lng, ci.lat), 4326)::geography)
    ORDER BY ci.population DESC NULLS LAST
    LIMIT 12
  `)
  const rows = result as unknown as Array<{
    name: string
    city_slug: string
    state_code: string
    state_slug: string
  }>
  const servedCities: RooferCity[] = rows.map((r) => ({
    name: r.name,
    citySlug: r.city_slug,
    stateCode: r.state_code,
    stateSlug: r.state_slug,
  }))

  return {
    id: c.id,
    slug: c.slug,
    companyName: c.companyName,
    bio: c.bio,
    logoUrl: c.logoUrl,
    bannerUrl: c.bannerUrl,
    yearsInBusiness: c.yearsInBusiness,
    licenseNumber: c.licenseNumber,
    avgResponseTimeMinutes: c.avgResponseTimeMinutes,
    avgRating: summary.avgRating,
    totalReviews: summary.total,
    reviews: summary.reviews.slice(0, 8),
    cities: servedCities,
  }
}

/** Verified roofers with a slug — the indexable set for the sitemap. */
export async function getVerifiedRooferSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  'use cache'
  cacheLife('standard')
  cacheTag('roofers')
  const rows = await db
    .select({ slug: contractors.slug, createdAt: contractors.createdAt })
    .from(contractors)
    .where(and(eq(contractors.verificationStatus, 'verified'), isNotNull(contractors.slug)))
  return rows.flatMap((r) => (r.slug ? [{ slug: r.slug, updatedAt: r.createdAt }] : []))
}
