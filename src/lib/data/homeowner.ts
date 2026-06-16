// Data layer for the homeowner dashboard.
//
// NOT cached ("use cache"): a homeowner's requests + match counts change the
// moment they post and as contractors engage, so they must be read fresh.
// Authorization is enforced by scoping every query to the caller's homeownerId.

import { cache } from 'react'
import { db } from '@/lib/db'
import { and, count, desc, eq, inArray } from 'drizzle-orm'
import {
  contractors,
  estimates,
  homeowners,
  leadRecipients,
  leads,
  projects,
  services,
} from '@/lib/db/schema'
import { subtypeLabel, subtypeList } from '@/lib/leads/subtype'
import { listConversationsForUser } from '@/lib/data/conversations'

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

export type LeadStatus = (typeof leads.status.enumValues)[number]
export type EstimateStatus = (typeof estimates.status.enumValues)[number]

/** The five columns of the homeowner "My requests" board. */
export type HomeownerRequestStatus = 'posted' | 'interested' | 'quotes' | 'hired' | 'done'

/** Derive the board column from the lead status + match/interest/quote counts. */
export function deriveRequestStatus(args: {
  status: LeadStatus
  interestedCount: number
  quoteCount: number
}): HomeownerRequestStatus {
  if (args.status === 'awarded') return 'hired'
  if (args.status === 'closed' || args.status === 'expired') return 'done'
  if (args.quoteCount > 0) return 'quotes'
  if (args.interestedCount > 0) return 'interested'
  return 'posted'
}

export type RequestContractor = {
  contractorId: string
  contractorName: string | null
  conversationId: string | null
  quoteTotal: string | null
  quoteStatus: EstimateStatus | null
  hasUnread: boolean
}

export type HomeownerRequestDetail = {
  leadId: string
  serviceName: string
  subtype: string | null
  subtypes: string[]
  status: LeadStatus
  requestStatus: HomeownerRequestStatus
  urgency: (typeof leads.urgency.enumValues)[number]
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  notes: string | null
  interestedCount: number
  quoteCount: number
  /** One row per contractor who started a conversation — each is its own chat. */
  contractors: RequestContractor[]
  createdAt: Date
}

/**
 * One request's full detail for the right-side Sheet: the request itself plus the
 * interested contractors, each linking to its own chat (a request fans out to
 * many contractor conversations). Authorized by scoping to the caller's
 * homeownerId; `userId` is only used to resolve unread + conversation ids.
 */
export async function getHomeownerRequestDetail(
  leadId: string,
  homeownerId: string,
  userId: string,
): Promise<HomeownerRequestDetail | null> {
  const [lead] = await db
    .select({
      id: leads.id,
      serviceName: services.name,
      serviceDetails: leads.serviceDetails,
      urgency: leads.urgency,
      status: leads.status,
      address: leads.address,
      city: leads.city,
      state: leads.state,
      zipCode: leads.zipCode,
      notes: leads.notes,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .innerJoin(services, eq(leads.serviceId, services.id))
    .where(and(eq(leads.id, leadId), eq(leads.homeownerId, homeownerId)))
    .limit(1)
  if (!lead) return null

  const projRows = await db
    .select({
      projectId: projects.id,
      contractorId: projects.contractorId,
      contractorName: contractors.companyName,
    })
    .from(projects)
    .innerJoin(contractors, eq(contractors.id, projects.contractorId))
    .where(eq(projects.leadId, leadId))

  const projectIds = projRows.map((p) => p.projectId)
  const latest = projectIds.length
    ? await db
        .selectDistinctOn([estimates.projectId], {
          projectId: estimates.projectId,
          total: estimates.total,
          status: estimates.status,
        })
        .from(estimates)
        .where(inArray(estimates.projectId, projectIds))
        .orderBy(estimates.projectId, desc(estimates.createdAt))
    : []
  const latestByProject = new Map(latest.map((l) => [l.projectId, l]))

  const summaries = await listConversationsForUser(userId)
  const convByProject = new Map(
    summaries.filter((s) => s.contextId).map((s) => [s.contextId as string, s]),
  )

  const contractorList: RequestContractor[] = projRows.map((p) => {
    const est = latestByProject.get(p.projectId)
    const conv = convByProject.get(p.projectId)
    return {
      contractorId: p.contractorId,
      contractorName: p.contractorName,
      conversationId: conv?.id ?? null,
      quoteTotal: est?.total ?? null,
      quoteStatus: est?.status ?? null,
      hasUnread: conv?.hasUnread ?? false,
    }
  })

  const interestedCount = contractorList.length
  const quoteCount = contractorList.filter((c) => c.quoteStatus != null).length

  return {
    leadId: lead.id,
    serviceName: lead.serviceName,
    subtype: subtypeLabel(lead.serviceDetails),
    subtypes: subtypeList(lead.serviceDetails),
    status: lead.status,
    requestStatus: deriveRequestStatus({ status: lead.status, interestedCount, quoteCount }),
    urgency: lead.urgency,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    zipCode: lead.zipCode,
    notes: lead.notes,
    interestedCount,
    quoteCount,
    contractors: contractorList,
    createdAt: lead.createdAt,
  }
}

export type HomeownerQuote = {
  estimateId: string
  contractorName: string | null
  status: EstimateStatus
  total: string | null
  lineItems: Array<{ label: string; amount: string }>
  scopeNotes: string | null
  validUntil: Date | null
}

export type HomeownerQuoteGroup = {
  leadId: string
  serviceName: string
  subtype: string | null
  leadStatus: LeadStatus
  city: string | null
  state: string | null
  quotes: HomeownerQuote[]
}

/** A homeowner's received quotes, grouped by request. Only sent/accepted shown. */
export async function getHomeownerQuotes(homeownerId: string): Promise<HomeownerQuoteGroup[]> {
  const rows = await db
    .select({
      estimateId: estimates.id,
      status: estimates.status,
      total: estimates.total,
      lineItems: estimates.lineItems,
      scopeNotes: estimates.scopeNotes,
      validUntil: estimates.validUntil,
      contractorName: contractors.companyName,
      leadId: leads.id,
      leadStatus: leads.status,
      serviceName: services.name,
      serviceDetails: leads.serviceDetails,
      city: leads.city,
      state: leads.state,
    })
    .from(estimates)
    .innerJoin(projects, eq(projects.id, estimates.projectId))
    .innerJoin(contractors, eq(contractors.id, projects.contractorId))
    .innerJoin(leads, eq(leads.id, projects.leadId))
    .innerJoin(services, eq(services.id, leads.serviceId))
    .where(and(eq(leads.homeownerId, homeownerId), inArray(estimates.status, ['sent', 'accepted'])))
    .orderBy(desc(estimates.createdAt))

  const groups = new Map<string, HomeownerQuoteGroup>()
  for (const r of rows) {
    let group = groups.get(r.leadId)
    if (!group) {
      group = {
        leadId: r.leadId,
        serviceName: r.serviceName,
        subtype: subtypeLabel(r.serviceDetails),
        leadStatus: r.leadStatus,
        city: r.city,
        state: r.state,
        quotes: [],
      }
      groups.set(r.leadId, group)
    }
    group.quotes.push({
      estimateId: r.estimateId,
      contractorName: r.contractorName,
      status: r.status,
      total: r.total,
      lineItems: r.lineItems,
      scopeNotes: r.scopeNotes,
      validUntil: r.validUntil,
    })
  }
  return [...groups.values()]
}
