// Public roofer (contractor) profile read layer for /roofers/[slug] SEO pages.
// Only VERIFIED contractors with a slug are exposed publicly. Cached under the
// `roofers` tag so profile edits / verification changes can bust it.

import { and, eq, isNotNull } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { cacheLife, cacheTag, updateTag } from 'next/cache'
import { db } from '@/lib/db'
import {
  contractors,
  contractorServices,
  cities,
  states,
  serviceAreas,
  portfolioProjects,
  portfolioImages,
  externalMedia,
} from '@/lib/db/schema'
import {
  getCombinedReviews,
  getExternalMedia,
  type CombinedReviews,
  type ExternalMediaItem,
} from '@/lib/data/integrations'
import { getPortfolio, type PortfolioProject } from '@/lib/data/portfolio'
import {
  getServiceAreas,
  getContractorSubtypes,
  getContractorWonCount,
  type ServiceArea,
} from '@/lib/data/dashboard'
import { roofingServiceId, type ProCard } from '@/lib/data/locations'

/** Invalidate cached roofer-profile data (profile edits, verification changes). */
export function revalidateRoofers(): void {
  updateTag('roofers')
}

export type RooferCity = { name: string; citySlug: string; stateCode: string; stateSlug: string }

export type RooferProfile = {
  id: string
  slug: string
  companyName: string | null
  logoUrl: string | null
  bio: string | null
  yearsInBusiness: number | null
  verified: boolean
  createdAt: Date
  /** Optional company intro video (upload or YouTube/Vimeo) + poster. */
  introVideoUrl: string | null
  introVideoPosterUrl: string | null
  /** Cached Hommy-native rating — for the AggregateRating schema only. */
  nativeAvgRating: number | null
  nativeTotalReviews: number
  /** Roofing service subtypes (Repair, Replacement, …). */
  subtypes: string[]
  /** Coverage areas (drive the coverage map + list). */
  areas: ServiceArea[]
  /** Published case studies (with before/after images). */
  portfolio: PortfolioProject[]
  /** Imported Google work photos. */
  googleMedia: ExternalMediaItem[]
  /** Combined Hommy + Google reviews (for display). */
  reviews: CombinedReviews
  /** Lifetime jobs won (public trust stat). */
  wonCount: number
  /** Cities this roofer covers → internal links + areaServed schema. */
  cities: RooferCity[]
}

/**
 * Resolve a verified roofer by slug (null → 404) for the public profile. Returns
 * exactly what the shared `ContractorProfileView` renders (so the public page
 * mirrors the contractor's own dashboard profile): identity, subtypes, coverage
 * areas, portfolio + Google media, combined reviews, jobs won, and served cities.
 * `nativeAvg*` is the cached Hommy-only projection, used only for the
 * AggregateRating structured data.
 */
export async function getRooferBySlug(slug: string): Promise<RooferProfile | null> {
  'use cache'
  cacheLife('standard')
  cacheTag('roofers', `roofer:${slug}`)

  const [c] = await db
    .select({
      id: contractors.id,
      slug: contractors.slug,
      companyName: contractors.companyName,
      logoUrl: contractors.logoUrl,
      bio: contractors.bio,
      yearsInBusiness: contractors.yearsInBusiness,
      createdAt: contractors.createdAt,
      introVideoUrl: contractors.introVideoUrl,
      introVideoPosterUrl: contractors.introVideoPosterUrl,
      avgRating: contractors.avgRating,
      totalReviews: contractors.totalReviews,
    })
    .from(contractors)
    .where(and(eq(contractors.slug, slug), eq(contractors.verificationStatus, 'verified')))
    .limit(1)
  if (!c || !c.slug) return null

  // Cities this roofer covers (centroid inside one of its areas) → internal links
  // back to the city pages (hub-and-spoke). Top by population.
  const [subtypes, areas, portfolio, reviews, googleMedia, wonCount, citiesResult] =
    await Promise.all([
      getContractorSubtypes(c.id),
      getServiceAreas(c.id),
      getPortfolio(c.id, { publishedOnly: true }),
      getCombinedReviews(c.id),
      getExternalMedia(c.id),
      getContractorWonCount(c.id),
      db.execute(sql`
        SELECT DISTINCT ci.name AS name, ci.slug AS city_slug,
               s.code AS state_code, s.slug AS state_slug, ci.population AS population
        FROM ${cities} ci
        JOIN ${states} s ON s.code = ci.state_code
        JOIN ${serviceAreas} sa ON sa.contractor_id = ${c.id}
        WHERE sa.geom IS NOT NULL
          AND ST_Covers(sa.geom, ST_SetSRID(ST_MakePoint(ci.lng, ci.lat), 4326)::geography)
        ORDER BY ci.population DESC NULLS LAST
        LIMIT 12
      `),
    ])

  const cityRows = citiesResult as unknown as Array<{
    name: string
    city_slug: string
    state_code: string
    state_slug: string
  }>
  const servedCities: RooferCity[] = cityRows.map((r) => ({
    name: r.name,
    citySlug: r.city_slug,
    stateCode: r.state_code,
    stateSlug: r.state_slug,
  }))

  return {
    id: c.id,
    slug: c.slug,
    companyName: c.companyName,
    logoUrl: c.logoUrl,
    bio: c.bio,
    yearsInBusiness: c.yearsInBusiness,
    verified: true,
    createdAt: c.createdAt,
    introVideoUrl: c.introVideoUrl,
    introVideoPosterUrl: c.introVideoPosterUrl,
    nativeAvgRating: c.avgRating != null ? parseFloat(c.avgRating) : null,
    nativeTotalReviews: c.totalReviews,
    subtypes,
    areas,
    portfolio,
    googleMedia,
    reviews,
    wonCount,
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

// ── Directory / listing layer ──────────────────────────────────────────────
// Verified, slugged roofers ranked by profile_score (the same reputation signal
// the lead matcher uses). All geo-generic — coverage is PostGIS, never bound to
// any state list. `ProCard` is the shared tile shape (from locations.ts).

type RawCard = {
  id: string
  slug: string | null
  company_name: string | null
  avg_rating: string | null
  total_reviews: number
  years_in_business: number | null
  logo_url: string | null
  subtypes: string[] | null
  images?: string[] | null
}

function toProCard(r: RawCard): ProCard {
  return {
    id: r.id,
    slug: r.slug,
    companyName: r.company_name,
    avgRating: r.avg_rating != null ? parseFloat(r.avg_rating) : null,
    totalReviews: r.total_reviews,
    yearsInBusiness: r.years_in_business,
    logoUrl: r.logo_url,
    subtypes: r.subtypes ?? [],
    images: (r.images ?? []).filter((u): u is string => !!u),
  }
}

/** Top verified roofers overall (homepage/hub "top companies" rail). */
export async function getFeaturedRoofers(limit = 6): Promise<ProCard[]> {
  'use cache'
  cacheLife('standard')
  cacheTag('roofers', 'cities')
  const serviceId = await roofingServiceId()
  if (!serviceId) return []
  const result = await db.execute(sql`
    SELECT ct.id, ct.slug, ct.company_name, ct.avg_rating, ct.total_reviews,
           ct.years_in_business, ct.logo_url, cs.subtypes
    FROM ${contractors} ct
    JOIN ${contractorServices} cs ON cs.contractor_id = ct.id AND cs.service_id = ${serviceId}
    WHERE ct.verification_status = 'verified' AND ct.slug IS NOT NULL
    ORDER BY ct.profile_score DESC NULLS LAST, ct.id
    LIMIT ${limit}
  `)
  return (result as unknown as RawCard[]).map(toProCard)
}

/** Verified roofers whose coverage reaches any city in a state (state hub rail). */
export async function getStateSupply(
  stateSlug: string,
  opts: { limit?: number } = {},
): Promise<{ proCount: number; pros: ProCard[] }> {
  'use cache'
  cacheLife('standard')
  cacheTag('roofers', 'cities', `state:${stateSlug}`)
  const serviceId = await roofingServiceId()
  if (!serviceId) return { proCount: 0, pros: [] }
  const limit = opts.limit ?? 9

  // True if this contractor's area covers the centroid of any city in the state.
  const coversState = sql`EXISTS (
    SELECT 1 FROM ${cities} c JOIN ${states} s ON s.code = c.state_code
    WHERE s.slug = ${stateSlug}
      AND ST_Covers(sa.geom, ST_SetSRID(ST_MakePoint(c.lng, c.lat), 4326)::geography)
  )`

  const counted = await db.execute(sql`
    SELECT count(DISTINCT ct.id)::int AS total
    FROM ${contractors} ct
    JOIN ${contractorServices} cs ON cs.contractor_id = ct.id AND cs.service_id = ${serviceId}
    JOIN ${serviceAreas} sa ON sa.contractor_id = ct.id
    WHERE ct.verification_status = 'verified' AND ct.slug IS NOT NULL
      AND sa.geom IS NOT NULL AND ${coversState}
  `)
  const proCount = (counted as unknown as { total: number }[])[0]?.total ?? 0
  if (proCount === 0) return { proCount: 0, pros: [] }

  const result = await db.execute(sql`
    SELECT DISTINCT ct.id, ct.slug, ct.company_name, ct.avg_rating, ct.total_reviews,
           ct.years_in_business, ct.logo_url, ct.profile_score, cs.subtypes
    FROM ${contractors} ct
    JOIN ${contractorServices} cs ON cs.contractor_id = ct.id AND cs.service_id = ${serviceId}
    JOIN ${serviceAreas} sa ON sa.contractor_id = ct.id
    WHERE ct.verification_status = 'verified' AND ct.slug IS NOT NULL
      AND sa.geom IS NOT NULL AND ${coversState}
    ORDER BY ct.profile_score DESC NULLS LAST, ct.id
    LIMIT ${limit}
  `)
  return { proCount, pros: (result as unknown as RawCard[]).map(toProCard) }
}

export type RoofersDirectoryResult = { items: ProCard[]; total: number; hasMore: boolean }

/**
 * The companies directory query. Verified+slugged roofers offering roofing,
 * optionally narrowed by company-name search (`q`), a service subtype, and/or a
 * point the contractor's coverage must reach (`near`). Ranked by profile_score,
 * paginated.
 */
export type RoofersSort = 'best' | 'rating' | 'reviews' | 'newest'

export async function getRoofersDirectory(opts: {
  q?: string
  subtype?: string
  near?: { lat: number; lng: number } | null
  /** Scope to roofers whose coverage reaches any city in this state. */
  stateSlug?: string
  sort?: RoofersSort
  page?: number
  pageSize?: number
}): Promise<RoofersDirectoryResult> {
  'use cache'
  cacheLife('standard')
  cacheTag('roofers', 'cities')
  const serviceId = await roofingServiceId()
  if (!serviceId) return { items: [], total: 0, hasMore: false }

  const page = Math.max(0, opts.page ?? 0)
  const pageSize = Math.min(60, Math.max(1, opts.pageSize ?? 12))
  const q = opts.q?.trim()
  const subtype = opts.subtype?.trim()
  const stateSlug = opts.stateSlug?.trim() || null
  const sort: RoofersSort = opts.sort ?? 'best'
  const orderBy =
    sort === 'rating'
      ? sql`ct.avg_rating DESC NULLS LAST, ct.total_reviews DESC, ct.id`
      : sort === 'reviews'
        ? sql`ct.total_reviews DESC, ct.id`
        : sort === 'newest'
          ? sql`ct.created_at DESC, ct.id`
          : sql`ct.profile_score DESC NULLS LAST, ct.id`
  const near =
    opts.near && Number.isFinite(opts.near.lat) && Number.isFinite(opts.near.lng) ? opts.near : null

  // Coverage join is needed whenever we filter by a place (point or state).
  const joinAreas =
    near || stateSlug ? sql`JOIN ${serviceAreas} sa ON sa.contractor_id = ct.id` : sql``
  const where = sql`
    ct.verification_status = 'verified' AND ct.slug IS NOT NULL
    ${q ? sql`AND ct.company_name ILIKE ${'%' + q + '%'}` : sql``}
    ${subtype ? sql`AND ${subtype} = ANY(cs.subtypes)` : sql``}
    ${near ? sql`AND sa.geom IS NOT NULL AND ST_Covers(sa.geom, ST_SetSRID(ST_MakePoint(${near.lng}, ${near.lat}), 4326)::geography)` : sql``}
    ${stateSlug ? sql`AND sa.geom IS NOT NULL AND EXISTS (
      SELECT 1 FROM ${cities} c JOIN ${states} s ON s.code = c.state_code
      WHERE s.slug = ${stateSlug}
        AND ST_Covers(sa.geom, ST_SetSRID(ST_MakePoint(c.lng, c.lat), 4326)::geography)
    )` : sql``}
  `

  // All work photos for the card: published portfolio images first, then imported
  // Google media — combined, not either/or.
  const imagesCol = sql`COALESCE((
    SELECT array_agg(t.url)
    FROM (
      SELECT pim.image_url AS url, 0 AS pri, pp.sort_order AS s1, pim.sort_order AS s2
      FROM ${portfolioImages} pim
      JOIN ${portfolioProjects} pp ON pp.id = pim.project_id
      WHERE pp.contractor_id = ct.id AND pp.is_published = true AND pim.image_url IS NOT NULL
      UNION ALL
      SELECT em.source_url AS url, 1 AS pri, 0 AS s1, 0 AS s2
      FROM ${externalMedia} em
      WHERE em.contractor_id = ct.id AND em.is_visible = true
      ORDER BY pri, s1, s2
      LIMIT 12
    ) t
  ), '{}'::text[]) AS images`

  const countRes = await db.execute(sql`
    SELECT count(*)::int AS total FROM (
      SELECT DISTINCT ct.id
      FROM ${contractors} ct
      JOIN ${contractorServices} cs ON cs.contractor_id = ct.id AND cs.service_id = ${serviceId}
      ${joinAreas}
      WHERE ${where}
    ) sub
  `)
  const total = (countRes as unknown as { total: number }[])[0]?.total ?? 0

  const result = await db.execute(sql`
    SELECT DISTINCT ct.id, ct.slug, ct.company_name, ct.avg_rating, ct.total_reviews,
           ct.years_in_business, ct.logo_url, ct.profile_score, ct.created_at, cs.subtypes, ${imagesCol}
    FROM ${contractors} ct
    JOIN ${contractorServices} cs ON cs.contractor_id = ct.id AND cs.service_id = ${serviceId}
    ${joinAreas}
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ${pageSize + 1} OFFSET ${page * pageSize}
  `)
  const rows = result as unknown as RawCard[]
  const hasMore = rows.length > pageSize
  return { items: rows.slice(0, pageSize).map(toProCard), total, hasMore }
}
