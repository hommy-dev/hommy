// Location (SEO) read layer. Powers the dynamic city pages
// (/roofing/[state]/[city]) and their indexability gate.
//
// A city is INDEXABLE only when >= INDEX_MIN_PROS verified roofers cover its
// centroid — the same predicate the lead matcher uses (ST_Covers on the GiST
// index). `getIndexableCities()` is the single source of truth shared by
// generateStaticParams, the sitemap, and the per-page noindex toggle, so they
// can never disagree.
//
// Cache: city metadata is `static` (rarely changes); supply/demand/storm panels
// are `standard` (the profile next.config.ts earmarks for city pages). All are
// tagged `cities` so a supply change (see contractor-coverage/onboarding/admin
// actions) can `revalidateTag('cities')` to light up / drop pages.

import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { cacheLife, cacheTag, updateTag } from 'next/cache'
import { db } from '@/lib/db'
import {
  cities,
  states,
  contractors,
  contractorServices,
  serviceAreas,
  services,
  leads,
  stormEvents,
} from '@/lib/db/schema'
import { findEligibleContractors } from '@/lib/leads/matching'
import { INDEX_MIN_PROS, CITY_PRO_LIMIT, STATE_HUB_CITY_LIMIT, DEMAND_WINDOW_DAYS } from '@/lib/config/seo'
import { OPERATING_STATE_NAMES, type OperatingState } from '@/lib/config/service-areas'

/**
 * Invalidate all cached location/SEO data so city pages + the sitemap
 * re-evaluate indexability after a supply change (service-area edits,
 * onboarding, verification). MUST be called from within a Server Action
 * (updateTag's constraint) — all current callers are.
 */
export function revalidateCityPages(): void {
  updateTag('cities')
  updateTag('cities:index')
}

/** Resolve the roofing service id once (cached). */
async function roofingServiceId(): Promise<string | null> {
  'use cache'
  cacheLife('static')
  cacheTag('services')
  const [row] = await db.select({ id: services.id }).from(services).where(eq(services.slug, 'roofing')).limit(1)
  return row?.id ?? null
}

export type IndexableCity = {
  stateCode: string
  stateSlug: string
  citySlug: string
  cityName: string
  updatedAt: Date
}

/**
 * Every city whose serving-pro count >= INDEX_MIN_PROS, ordered by population.
 * The authoritative indexable set for generateStaticParams + sitemap.
 */
export async function getIndexableCities(): Promise<IndexableCity[]> {
  'use cache'
  cacheLife('standard')
  cacheTag('cities', 'cities:index')
  const serviceId = await roofingServiceId()
  if (!serviceId) return []

  // Correlated count of verified roofers covering each city's centroid, gated
  // by INDEX_MIN_PROS. Same predicate as findEligibleContractors / getCitySupply.
  const result = await db.execute(sql`
    SELECT c.slug AS city_slug, c.name AS city_name,
           s.code AS state_code, s.slug AS state_slug, c.created_at AS updated_at
    FROM ${cities} c
    JOIN ${states} s ON s.code = c.state_code
    WHERE (
      SELECT count(DISTINCT ct.id)
      FROM ${contractors} ct
      JOIN ${contractorServices} cs ON cs.contractor_id = ct.id AND cs.service_id = ${serviceId}
      JOIN ${serviceAreas} sa ON sa.contractor_id = ct.id
      WHERE ct.verification_status = 'verified'
        AND sa.geom IS NOT NULL
        AND ST_Covers(sa.geom, ST_SetSRID(ST_MakePoint(c.lng, c.lat), 4326)::geography)
    ) >= ${INDEX_MIN_PROS}
    ORDER BY c.population DESC NULLS LAST
  `)

  const rows = result as unknown as Array<{
    city_slug: string
    city_name: string
    state_code: string
    state_slug: string
    updated_at: string | Date
  }>
  return rows.map((r) => ({
    stateCode: r.state_code,
    stateSlug: r.state_slug,
    citySlug: r.city_slug,
    cityName: r.city_name,
    updatedAt: new Date(r.updated_at),
  }))
}

/** Operating states + how many of their cities are currently indexable (hub). */
export async function getStatesWithCounts(): Promise<
  { code: string; name: string; slug: string; indexableCityCount: number }[]
> {
  'use cache'
  cacheLife('standard')
  cacheTag('cities', 'states')
  const indexable = await getIndexableCities()
  const counts = new Map<string, number>()
  for (const c of indexable) counts.set(c.stateCode, (counts.get(c.stateCode) ?? 0) + 1)

  const rows = await db
    .select({ code: states.code, name: states.name, slug: states.slug })
    .from(states)
    .where(eq(states.isOperating, true))
    .orderBy(states.name)
  return rows.map((s) => ({ ...s, indexableCityCount: counts.get(s.code) ?? 0 }))
}

/** A state hub: the state row + its indexable cities (population desc, capped). */
export async function getStateWithCities(stateSlug: string): Promise<
  | {
      state: { code: string; name: string; slug: string }
      cities: { slug: string; name: string }[]
      totalIndexable: number
    }
  | null
> {
  'use cache'
  cacheLife('standard')
  cacheTag('cities', `state:${stateSlug}`)
  const [state] = await db
    .select({ code: states.code, name: states.name, slug: states.slug })
    .from(states)
    .where(eq(states.slug, stateSlug))
    .limit(1)
  if (!state) return null

  const indexable = (await getIndexableCities()).filter((c) => c.stateCode === state.code)
  return {
    state,
    cities: indexable.slice(0, STATE_HUB_CITY_LIMIT).map((c) => ({ slug: c.citySlug, name: c.cityName })),
    totalIndexable: indexable.length,
  }
}

export type CityRow = {
  id: string
  name: string
  slug: string
  stateCode: string
  stateName: string
  stateSlug: string
  lat: number
  lng: number
  intro: string | null
  faq: { q: string; a: string }[] | null
}

/** Resolve a canonical city by state+city slug (null → 404). */
export async function getCity(stateSlug: string, citySlug: string): Promise<CityRow | null> {
  'use cache'
  cacheLife('static')
  cacheTag(`city:${stateSlug}/${citySlug}`)
  const [row] = await db
    .select({
      id: cities.id,
      name: cities.name,
      slug: cities.slug,
      stateCode: cities.stateCode,
      stateName: states.name,
      stateSlug: states.slug,
      lat: cities.lat,
      lng: cities.lng,
      intro: cities.intro,
      faq: cities.faq,
    })
    .from(cities)
    .innerJoin(states, eq(states.code, cities.stateCode))
    .where(and(eq(states.slug, stateSlug), eq(cities.slug, citySlug)))
    .limit(1)
  return row ?? null
}

export type ProCard = {
  id: string
  slug: string | null // → /roofers/[slug] when set
  companyName: string | null
  avgRating: number | null
  totalReviews: number
  yearsInBusiness: number | null
  logoUrl: string | null
}

/**
 * Supply for one city: the true serving-pro count (the index gate) plus the top
 * pro cards to render. Reuses findEligibleContractors for ranking, then hydrates
 * display columns (order preserved).
 */
export async function getCitySupplyForCity(
  stateSlug: string,
  citySlug: string,
): Promise<{ proCount: number; pros: ProCard[] }> {
  'use cache'
  cacheLife('standard')
  cacheTag('cities', `city:${stateSlug}/${citySlug}`)
  const [city, serviceId] = await Promise.all([getCity(stateSlug, citySlug), roofingServiceId()])
  if (!city || !serviceId) return { proCount: 0, pros: [] }

  // True count of verified roofers covering the centroid (may exceed CITY_PRO_LIMIT).
  const point = sql`ST_SetSRID(ST_MakePoint(${city.lng}, ${city.lat}), 4326)::geography`
  const [counted] = await db
    .select({ count: sql<number>`count(distinct ${contractors.id})::int` })
    .from(contractors)
    .innerJoin(
      contractorServices,
      and(eq(contractorServices.contractorId, contractors.id), eq(contractorServices.serviceId, serviceId)),
    )
    .innerJoin(serviceAreas, eq(serviceAreas.contractorId, contractors.id))
    .where(
      and(
        eq(contractors.verificationStatus, 'verified'),
        isNotNull(serviceAreas.geom),
        sql`ST_Covers(${serviceAreas.geom}, ${point})`,
      ),
    )
  const proCount = counted?.count ?? 0
  if (proCount === 0) return { proCount: 0, pros: [] }

  // Ranked ids (profile_score desc) from the shared matcher, then hydrate.
  const ranked = await findEligibleContractors(
    { serviceId, lat: city.lat, lng: city.lng },
    db,
    { limit: CITY_PRO_LIMIT },
  )
  const ids = ranked.map((r) => r.contractorId)
  if (ids.length === 0) return { proCount, pros: [] }

  const rows = await db
    .select({
      id: contractors.id,
      slug: contractors.slug,
      companyName: contractors.companyName,
      avgRating: contractors.avgRating,
      totalReviews: contractors.totalReviews,
      yearsInBusiness: contractors.yearsInBusiness,
      logoUrl: contractors.logoUrl,
    })
    .from(contractors)
    .where(inArray(contractors.id, ids))
  const byId = new Map(rows.map((r) => [r.id, r]))

  // Preserve the matcher's ranking (inArray doesn't guarantee order).
  const pros: ProCard[] = ids.flatMap((id) => {
    const r = byId.get(id)
    if (!r) return []
    return [
      {
        id: r.id,
        slug: r.slug,
        companyName: r.companyName,
        avgRating: r.avgRating != null ? parseFloat(r.avgRating) : null,
        totalReviews: r.totalReviews,
        yearsInBusiness: r.yearsInBusiness,
        logoUrl: r.logoUrl,
      },
    ]
  })
  return { proCount, pros }
}

/** Soft "X homeowners requested quotes here recently" signal. Never gates indexing. */
export async function getCityDemand(stateCode: string, cityName: string): Promise<{ recentRequests: number }> {
  'use cache'
  cacheLife('standard')
  cacheTag('cities')
  const stateName = OPERATING_STATE_NAMES[stateCode as OperatingState] ?? stateCode
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .where(
      and(
        sql`lower(${leads.city}) = lower(${cityName})`,
        // leads.state is free-text: accept the code or the full name.
        sql`(${leads.state} = ${stateCode} OR lower(${leads.state}) = lower(${stateName}))`,
        sql`${leads.createdAt} >= now() - make_interval(days => ${DEMAND_WINDOW_DAYS})`,
      ),
    )
  return { recentRequests: row?.count ?? 0 }
}

/** Local storm context for a city, via leads linked to storm events (render only if non-empty). */
export async function getCityStormHistory(
  stateCode: string,
  cityName: string,
): Promise<{ eventType: string; severity: string | null; detectedAt: Date }[]> {
  'use cache'
  cacheLife('standard')
  cacheTag('cities')
  const stateName = OPERATING_STATE_NAMES[stateCode as OperatingState] ?? stateCode
  return db
    .selectDistinct({
      eventType: stormEvents.eventType,
      severity: stormEvents.severity,
      detectedAt: stormEvents.detectedAt,
    })
    .from(stormEvents)
    .innerJoin(leads, eq(leads.stormEventId, stormEvents.id))
    .where(
      and(
        sql`lower(${leads.city}) = lower(${cityName})`,
        sql`(${leads.state} = ${stateCode} OR lower(${leads.state}) = lower(${stateName}))`,
      ),
    )
    .orderBy(desc(stormEvents.detectedAt))
    .limit(5)
}
