// Data layer for the homeowner dashboard.
//
// NOT cached ("use cache"): a homeowner's requests + match counts change the
// moment they post and as contractors engage, so they must be read fresh.
// Authorization is enforced by scoping every query to the caller's homeownerId.

import { db } from '@/lib/db'
import { count, desc, eq, inArray } from 'drizzle-orm'
import { homeowners, leadRecipients, leads, services } from '@/lib/db/schema'
import { subtypeLabel } from '@/lib/leads/subtype'

/** Map an authenticated user → their 1:1 homeowner profile. */
export async function getHomeownerForUser(
  userId: string,
): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: homeowners.id })
    .from(homeowners)
    .where(eq(homeowners.userId, userId))
    .limit(1)
  return row ?? null
}

export type HomeownerLead = {
  id: string
  serviceName: string
  subtype: string | null
  urgency: (typeof leads.urgency.enumValues)[number]
  status: (typeof leads.status.enumValues)[number]
  city: string | null
  state: string | null
  zipCode: string | null
  matchedCount: number
  createdAt: Date
}

/** A homeowner's posted jobs, newest first, with how many contractors each was offered to. */
export async function getHomeownerLeads(
  homeownerId: string,
): Promise<HomeownerLead[]> {
  const rows = await db
    .select({
      id: leads.id,
      serviceName: services.name,
      serviceDetails: leads.serviceDetails,
      urgency: leads.urgency,
      status: leads.status,
      city: leads.city,
      state: leads.state,
      zipCode: leads.zipCode,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .innerJoin(services, eq(leads.serviceId, services.id))
    .where(eq(leads.homeownerId, homeownerId))
    .orderBy(desc(leads.createdAt))

  if (rows.length === 0) return []

  // One grouped count instead of N per-lead queries.
  const counts = await db
    .select({ leadId: leadRecipients.leadId, value: count() })
    .from(leadRecipients)
    .where(
      inArray(
        leadRecipients.leadId,
        rows.map((r) => r.id),
      ),
    )
    .groupBy(leadRecipients.leadId)
  const countByLead = new Map(counts.map((c) => [c.leadId, c.value]))

  return rows.map((r) => {
    const subtype = subtypeLabel(r.serviceDetails)
    return {
      id: r.id,
      serviceName: r.serviceName,
      subtype,
      urgency: r.urgency,
      status: r.status,
      city: r.city,
      state: r.state,
      zipCode: r.zipCode,
      matchedCount: countByLead.get(r.id) ?? 0,
      createdAt: r.createdAt,
    }
  })
}
