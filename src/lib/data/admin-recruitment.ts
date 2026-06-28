// Admin reads for the recruitment engine. NOT cached — like the rest of the
// admin data layer (src/lib/data/admin.ts), demand must be fresh. Authorization
// is enforced by the caller (admin pages call getRequiredUser('admin')).

import { db } from '@/lib/db'
import { and, desc, eq, sql } from 'drizzle-orm'
import { leads } from '@/lib/db/schema'

const ADMIN_LIST_LIMIT = 200

export type UncoveredDemandRow = {
  state: string | null
  city: string | null
  /** How many open leads are awaiting coverage in this place. */
  count: number
  oldest: Date
  newest: Date
}

/**
 * Where homeowners posted but no verified contractor covers the area — the
 * recruitment target list, ranked by how much demand is waiting. Inverse of the
 * city-supply reads in src/lib/data/locations.ts.
 */
export async function getUncoveredDemand(): Promise<UncoveredDemandRow[]> {
  const rows = await db
    .select({
      state: leads.state,
      city: leads.city,
      count: sql<number>`count(*)::int`,
      oldest: sql<Date>`min(${leads.createdAt})`,
      newest: sql<Date>`max(${leads.createdAt})`,
    })
    .from(leads)
    .where(and(eq(leads.awaitingCoverage, true), eq(leads.status, 'open')))
    .groupBy(leads.state, leads.city)
    .orderBy(desc(sql`count(*)`))
    .limit(ADMIN_LIST_LIMIT)

  return rows.map((r) => ({
    state: r.state,
    city: r.city,
    count: r.count,
    oldest: r.oldest,
    newest: r.newest,
  }))
}
