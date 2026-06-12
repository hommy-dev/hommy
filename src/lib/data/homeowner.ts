// Data layer for the homeowner dashboard.
//
// NOT cached ("use cache"): a homeowner's requests + match counts change the
// moment they post and as contractors engage, so they must be read fresh.
// Authorization is enforced by scoping every query to the caller's homeownerId.

import { cache } from 'react'
import { db } from '@/lib/db'
import { and, count, desc, eq, inArray } from 'drizzle-orm'
import {
  estimates,
  homeowners,
  leadRecipients,
  leads,
  projects,
  services,
} from '@/lib/db/schema'
import { subtypeLabel } from '@/lib/leads/subtype'

/** Map an authenticated user → their 1:1 homeowner profile. Deduped per request. */
export const getHomeownerForUser = cache(async (
  userId: string,
): Promise<{ id: string } | null> => {
  const [row] = await db
    .select({ id: homeowners.id })
    .from(homeowners)
    .where(eq(homeowners.userId, userId))
    .limit(1)
  return row ?? null
})

export type HomeownerLead = {
  id: string
  serviceName: string
  subtype: string | null
  urgency: (typeof leads.urgency.enumValues)[number]
  status: (typeof leads.status.enumValues)[number]
  city: string | null
  state: string | null
  zipCode: string | null
  /** How many companies the lead was offered to. */
  matchedCount: number
  /** How many engaged (started a conversation) — "interested" to the homeowner. */
  interestedCount: number
  /** How many quotes have been sent for this request. */
  quoteCount: number
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
  const leadIds = rows.map((r) => r.id)

  // Grouped counts (one query each) instead of N per-lead queries:
  //  • matched   = every offer row
  //  • interested = offers that engaged (started a conversation)
  const [matched, interested, quotes] = await Promise.all([
    db
      .select({ leadId: leadRecipients.leadId, value: count() })
      .from(leadRecipients)
      .where(inArray(leadRecipients.leadId, leadIds))
      .groupBy(leadRecipients.leadId),
    db
      .select({ leadId: leadRecipients.leadId, value: count() })
      .from(leadRecipients)
      .where(
        and(
          inArray(leadRecipients.leadId, leadIds),
          inArray(leadRecipients.status, ['engaged', 'won', 'lost']),
        ),
      )
      .groupBy(leadRecipients.leadId),
    // Quotes actually sent to the homeowner, via the engaged contractor's project.
    db
      .select({ leadId: projects.leadId, value: count() })
      .from(estimates)
      .innerJoin(projects, eq(projects.id, estimates.projectId))
      .where(
        and(
          inArray(projects.leadId, leadIds),
          inArray(estimates.status, ['sent', 'accepted']),
        ),
      )
      .groupBy(projects.leadId),
  ])

  const matchedBy = new Map(matched.map((c) => [c.leadId, c.value]))
  const interestedBy = new Map(interested.map((c) => [c.leadId, c.value]))
  const quotesBy = new Map(
    quotes.map((c) => [c.leadId as string, c.value]),
  )

  return rows.map((r) => ({
    id: r.id,
    serviceName: r.serviceName,
    subtype: subtypeLabel(r.serviceDetails),
    urgency: r.urgency,
    status: r.status,
    city: r.city,
    state: r.state,
    zipCode: r.zipCode,
    matchedCount: matchedBy.get(r.id) ?? 0,
    interestedCount: interestedBy.get(r.id) ?? 0,
    quoteCount: quotesBy.get(r.id) ?? 0,
    createdAt: r.createdAt,
  }))
}
