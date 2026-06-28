// Recruitment discovery: given an uncovered point, find roofing companies via
// Google Places (server) and upsert them as contractor_prospects. Companies with
// a website but no email yet get queued for the Python enrichment worker; those
// with no website at all are marked `no_email` (we can't find an address, so we
// skip them — no SMS fallback).

import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorProspects, prospectEnrichmentJobs } from '@/lib/db/schema'
import { searchPlaces, domainFromUrl } from '@/lib/integrations/google-places-server'
import {
  searchTermForService,
  DISCOVERY_RADIUS_METERS,
  DISCOVERY_MAX_RESULTS,
} from '@/lib/config/recruitment'

export type DiscoverArgs = {
  serviceId: string
  serviceSlug: string | null
  lat: number
  lng: number
  city: string | null
  state: string | null
}

export async function discoverProspectsNear(
  args: DiscoverArgs,
): Promise<{ found: number; inserted: number; queued: number }> {
  const places = await searchPlaces({
    query: searchTermForService(args.serviceSlug),
    lat: args.lat,
    lng: args.lng,
    radiusMeters: DISCOVERY_RADIUS_METERS,
    maxResults: DISCOVERY_MAX_RESULTS,
  })

  let inserted = 0
  let queued = 0

  for (const p of places) {
    // Dedupe by (service, place_id) — a single discovery run, debounced upstream,
    // so a pre-check select is enough; the unique index is the safety net.
    const [existing] = await db
      .select({ id: contractorProspects.id })
      .from(contractorProspects)
      .where(
        and(
          eq(contractorProspects.serviceId, args.serviceId),
          eq(contractorProspects.sourceRef, p.placeId),
        ),
      )
      .limit(1)
    if (existing) continue

    const domain = domainFromUrl(p.website)
    let row: { id: string } | undefined
    try {
      ;[row] = await db
        .insert(contractorProspects)
        .values({
          serviceId: args.serviceId,
          companyName: p.name,
          phone: p.phone,
          website: p.website,
          domain,
          city: args.city,
          state: args.state,
          lat: p.lat,
          lng: p.lng,
          source: 'google_places',
          sourceRef: p.placeId,
          rating: p.rating != null ? String(p.rating) : null,
          reviewCount: p.reviewCount,
          // No website ⇒ no way to find an email ⇒ skip (no_email). Else queue it.
          enrichmentStatus: p.website ? 'discovered' : 'no_email',
          meta: p.formattedAddress ? { formattedAddress: p.formattedAddress } : {},
        })
        .returning({ id: contractorProspects.id })
    } catch (err) {
      // Unique-violation race (same place / same email) — fine, just skip.
      console.error('[discovery] insert skipped', err)
      continue
    }
    if (!row) continue
    inserted++

    if (p.website) {
      await db
        .insert(prospectEnrichmentJobs)
        .values({ prospectId: row.id })
        .onConflictDoNothing({ target: prospectEnrichmentJobs.prospectId })
      queued++
    }
  }

  return { found: places.length, inserted, queued }
}
