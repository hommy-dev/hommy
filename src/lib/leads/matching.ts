// Lead matching — given a new lead's service + location, find the contractor
// companies eligible to receive it. The "free fan-out" of
// docs/HOMEI_PLATFORM.md §4.1 step 2.
//
// GEOGRAPHIC matching: a company is eligible when (a) it's verified, (b) it
// offers this service, and (c) the lead's point falls inside at least one of its
// service_areas. Each area is stored as a PostGIS geography (`geom`) — a buffered
// circle for radius areas, an arbitrary polygon for drawn areas — so one
// `ST_Covers` predicate, backed by a GiST index, handles both shapes worldwide.
// Ranked by profile_score. Phase 1 fans out BROADLY (leads are free) — up to
// LEAD_FANOUT.maxRecipients — rather than to a handful of slots, so a homeowner
// isn't left waiting on a few pros who might all ghost.

import { db } from '@/lib/db'
import { and, desc, eq, isNotNull, notInArray, sql } from 'drizzle-orm'
import { contractors, contractorServices, serviceAreas } from '@/lib/db/schema'
import { LEAD_FANOUT } from '@/lib/config/tunables'

// Accepts either the base client or an open transaction so matching can run
// inside the same transaction that inserts the lead.
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0]

export type EligibleContractor = { contractorId: string }

export async function findEligibleContractors(
  { serviceId, lat, lng }: { serviceId: string; lat: number; lng: number },
  executor: DbExecutor = db,
  opts: { excludeContractorIds?: string[]; limit?: number } = {},
): Promise<EligibleContractor[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []

  // The lead's location as a geography point (lng, lat order for ST_MakePoint).
  const leadPoint = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`

  const exclude = opts.excludeContractorIds ?? []

  const rows = await executor
    .selectDistinct({
      contractorId: contractors.id,
      profileScore: contractors.profileScore,
    })
    .from(contractors)
    .innerJoin(
      contractorServices,
      and(
        eq(contractorServices.contractorId, contractors.id),
        eq(contractorServices.serviceId, serviceId),
      ),
    )
    .innerJoin(serviceAreas, eq(serviceAreas.contractorId, contractors.id))
    .where(
      and(
        eq(contractors.verificationStatus, 'verified'),
        isNotNull(serviceAreas.geom),
        // the lead's point lies inside this area's coverage shape
        sql`ST_Covers(${serviceAreas.geom}, ${leadPoint})`,
        // cascade: skip companies already offered this lead
        exclude.length > 0 ? notInArray(contractors.id, exclude) : undefined,
      ),
    )
    .orderBy(desc(contractors.profileScore))
    .limit(opts.limit ?? LEAD_FANOUT.maxRecipients)

  return rows.map((r) => ({ contractorId: r.contractorId }))
}
