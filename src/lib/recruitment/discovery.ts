// Recruitment discovery: given an uncovered point, find roofing companies and
// upsert them as contractor_prospects. Source is Google Places Text Search when
// the server key is configured + unblocked (richer data, incl. ratings), falling
// back to OpenStreetMap (Overpass) otherwise — no billing card needed for the
// fallback. Companies with a website but no email yet get queued for the Python
// enrichment worker; those with no website at all are marked `no_email` (we can't
// find an address, so we skip them — no SMS fallback).

import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorProspects, prospectEnrichmentJobs } from '@/lib/db/schema'
import { searchPlaces as searchOsm, domainFromUrl } from '@/lib/integrations/osm-places-server'
import {
  searchPlacesViaGoogle,
  googleConfigured,
} from '@/lib/integrations/google-places-server'
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
): Promise<{ found: number; inserted: number; queued: number; queuedProspectIds: string[] }> {
  const searchOpts = {
    query: searchTermForService(args.serviceSlug),
    lat: args.lat,
    lng: args.lng,
    radiusMeters: DISCOVERY_RADIUS_METERS,
    maxResults: DISCOVERY_MAX_RESULTS,
  }

  // Prefer Google (rich data + ratings); fall back to OSM if the key is unset,
  // blocked, errors, or returns nothing. One source per run — we don't merge,
  // to avoid the same company landing twice under different place ids.
  let source = 'google_places'
  let places = googleConfigured() ? await searchPlacesViaGoogle(searchOpts) : []
  if (places.length === 0) {
    source = 'openstreetmap'
    places = await searchOsm(searchOpts)
  }

  let inserted = 0
  let queued = 0
  const queuedProspectIds: string[] = []

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
          source,
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
      queuedProspectIds.push(row.id)
    }
  }

  return { found: places.length, inserted, queued, queuedProspectIds }
}
