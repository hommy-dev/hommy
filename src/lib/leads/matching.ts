// Lead matching — given a new lead's service + location, find the contractor
// companies eligible to receive it. The "free fan-out" of
// docs/HOMEI_PLATFORM.md §4.1 step 2.
//
// GEOGRAPHIC (radius) matching: a company is eligible when (a) it's verified,
// (b) it offers this service, and (c) the lead's lat/lng falls within the radius
// of at least one of its service_areas (center point + radius_miles), measured
// by Haversine distance. This works worldwide — it relies on coordinates, not
// postal-code strings. Ranked by profile_score, capped at OFFER_CAP.

import { db } from '@/lib/db'
import { and, desc, eq, isNotNull, lte, sql } from 'drizzle-orm'
import { contractors, contractorServices, serviceAreas } from '@/lib/db/schema'
import { haversineMilesSql } from '@/lib/geo/haversine'

// Accepts either the base client or an open transaction so matching can run
// inside the same transaction that inserts the lead.
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0]

/** Hard ceiling on how many companies a single lead is offered to up front. */
export const OFFER_CAP = 10

export type EligibleContractor = { contractorId: string }

export async function findEligibleContractors(
  { serviceId, lat, lng }: { serviceId: string; lat: number; lng: number },
  executor: DbExecutor = db,
): Promise<EligibleContractor[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []

  // Distance (miles) from the lead to each candidate service-area centre.
  const distance = haversineMilesSql(
    lat,
    lng,
    sql`${serviceAreas.lat}`,
    sql`${serviceAreas.lng}`,
  )

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
        isNotNull(serviceAreas.lat),
        isNotNull(serviceAreas.lng),
        // within this area's own radius
        lte(distance, serviceAreas.radiusMiles),
      ),
    )
    .orderBy(desc(contractors.profileScore))
    .limit(OFFER_CAP)

  return rows.map((r) => ({ contractorId: r.contractorId }))
}
