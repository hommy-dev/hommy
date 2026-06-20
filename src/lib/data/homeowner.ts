// Data layer for the homeowner dashboard.
//
// NOT cached ("use cache"): a homeowner's requests + match counts change the
// moment they post and as contractors engage, so they must be read fresh.
// Authorization is enforced by scoping every query to the caller's homeownerId.

import { cache } from 'react'
import { db } from '@/lib/db'
import { and, count, desc, eq, inArray, isNotNull, min } from 'drizzle-orm'
import {
  contractors,
  estimates,
  homeowners,
  leadRecipients,
  leads,
  projects,
  reviews,
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
  /** How many pros have opened/viewed the job (powers "X pros viewed"). */
  viewedCount: number
  /** How many engaged (started a conversation) — "interested" to the homeowner. */
  interestedCount: number
  /** How many quotes have been sent for this request. */
  quoteCount: number
  /** Best (lowest) quote total across contractors, for the table's Quote column. */
  bestQuoteTotal: string | null
  /** True once the hired contractor marked the job completed (projects.stage). */
  projectCompleted: boolean
  createdAt: Date
}

/** A homeowner's posted jobs, newest first, with how many contractors each was
 *  offered to. Deduped per request so the layout (notice) + page share one read. */
export const getHomeownerLeads = cache(async (
  homeownerId: string,
): Promise<HomeownerLead[]> => {
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
  //  • completed = leads whose hired contractor marked the project completed
  const [matched, viewed, interested, quotes, completed] = await Promise.all([
    db
      .select({ leadId: leadRecipients.leadId, value: count() })
      .from(leadRecipients)
      .where(inArray(leadRecipients.leadId, leadIds))
      .groupBy(leadRecipients.leadId),
    // How many pros opened the job (viewedAt stamped).
    db
      .select({ leadId: leadRecipients.leadId, value: count() })
      .from(leadRecipients)
      .where(and(inArray(leadRecipients.leadId, leadIds), isNotNull(leadRecipients.viewedAt)))
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
    // Quotes actually sent to the homeowner, via the engaged contractor's project
    // — count + the best (lowest) total for the table's Quote column.
    db
      .select({ leadId: projects.leadId, value: count(), best: min(estimates.total) })
      .from(estimates)
      .innerJoin(projects, eq(projects.id, estimates.projectId))
      .where(
        and(
          inArray(projects.leadId, leadIds),
          inArray(estimates.status, ['sent', 'accepted']),
        ),
      )
      .groupBy(projects.leadId),
    // Leads whose hired contractor marked the project completed.
    db
      .select({ leadId: projects.leadId, value: count() })
      .from(projects)
      .where(and(inArray(projects.leadId, leadIds), eq(projects.stage, 'completed')))
      .groupBy(projects.leadId),
  ])

  const matchedBy = new Map(matched.map((c) => [c.leadId, c.value]))
  const viewedBy = new Map(viewed.map((c) => [c.leadId, c.value]))
  const interestedBy = new Map(interested.map((c) => [c.leadId, c.value]))
  const quotesBy = new Map(quotes.map((c) => [c.leadId as string, c]))
  const completedSet = new Set(completed.map((c) => c.leadId as string))

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
    viewedCount: viewedBy.get(r.id) ?? 0,
    interestedCount: interestedBy.get(r.id) ?? 0,
    quoteCount: quotesBy.get(r.id)?.value ?? 0,
    bestQuoteTotal: quotesBy.get(r.id)?.best ?? null,
    projectCompleted: completedSet.has(r.id),
    createdAt: r.createdAt,
  }))
})

export type LeadStatus = (typeof leads.status.enumValues)[number]
export type EstimateStatus = (typeof estimates.status.enumValues)[number]

/** The five columns of the homeowner "My requests" board. */
export type HomeownerRequestStatus = 'posted' | 'interested' | 'quotes' | 'hired' | 'done'

/** Derive the board column from the lead status + match/interest/quote counts. */
export function deriveRequestStatus(args: {
  status: LeadStatus
  interestedCount: number
  quoteCount: number
  /** True once the awarded contractor has marked their project completed. */
  projectCompleted: boolean
}): HomeownerRequestStatus {
  // A completed job is "done" for the homeowner too — the contractor drives
  // completion via projects.stage, which the homeowner has no lead-status mirror
  // of, so we read it directly (the divergence bug: leads stays `awarded`).
  if (args.projectCompleted) return 'done'
  if (args.status === 'awarded') return 'hired'
  if (args.status === 'closed' || args.status === 'expired') return 'done'
  if (args.quoteCount > 0) return 'quotes'
  if (args.interestedCount > 0) return 'interested'
  return 'posted'
}

export type HomeownerNoticeData = {
  jobsCount: number
  /** Jobs that have quotes waiting for a decision (not yet hired). */
  quotes: number
  /** Jobs where pros engaged but no quote yet. */
  interested: number
  /** Posted jobs being looked at (matched/viewed), nobody engaged yet. */
  waiting: number
  /** Hired + in progress (awarded, not completed). */
  hired: { count: number; contractorName: string | null }
  /** Completed jobs the homeowner hasn't reviewed yet. */
  reviewPending: { count: number; contractorName: string | null }
}

/**
 * Aggregated state for the homeowner sidebar notice — what's the single most
 * relevant thing across all their jobs. Reuses getHomeownerLeads (deduped per
 * request) plus two light lookups for the hired-contractor name + which jobs
 * already have a review.
 */
export async function getHomeownerNoticeData(homeownerId: string): Promise<HomeownerNoticeData> {
  const myLeads = await getHomeownerLeads(homeownerId)

  const [awardedRows, reviewedRows] = await Promise.all([
    db
      .select({ leadId: leads.id, name: contractors.companyName })
      .from(leads)
      .innerJoin(contractors, eq(contractors.id, leads.awardedTo))
      .where(and(eq(leads.homeownerId, homeownerId), isNotNull(leads.awardedTo))),
    db
      .selectDistinct({ leadId: projects.leadId })
      .from(reviews)
      .innerJoin(projects, eq(projects.id, reviews.projectId))
      .innerJoin(leads, eq(leads.id, projects.leadId))
      .where(and(eq(leads.homeownerId, homeownerId), isNotNull(reviews.submittedAt))),
  ])
  const nameByLead = new Map(awardedRows.map((r) => [r.leadId, r.name]))
  const reviewed = new Set(reviewedRows.map((r) => r.leadId))

  let quotes = 0
  let interested = 0
  let waiting = 0
  let hiredCount = 0
  let hiredName: string | null = null
  let reviewCount = 0
  let reviewName: string | null = null

  for (const l of myLeads) {
    const status = deriveRequestStatus({
      status: l.status,
      interestedCount: l.interestedCount,
      quoteCount: l.quoteCount,
      projectCompleted: l.projectCompleted,
    })
    if (status === 'done') {
      // Only completed-and-unreviewed jobs prompt a review (not closed/expired).
      if (l.projectCompleted && !reviewed.has(l.id)) {
        reviewCount++
        if (!reviewName) reviewName = nameByLead.get(l.id) ?? null
      }
    } else if (status === 'quotes') {
      quotes++
    } else if (status === 'interested') {
      interested++
    } else if (status === 'hired') {
      hiredCount++
      if (!hiredName) hiredName = nameByLead.get(l.id) ?? null
    } else if (status === 'posted' && (l.matchedCount > 0 || l.viewedCount > 0)) {
      waiting++
    }
  }

  return {
    jobsCount: myLeads.length,
    quotes,
    interested,
    waiting,
    hired: { count: hiredCount, contractorName: hiredName },
    reviewPending: { count: reviewCount, contractorName: reviewName },
  }
}

export type RequestContractor = {
  contractorId: string
  contractorName: string | null
  conversationId: string | null
  quoteTotal: string | null
  quoteStatus: EstimateStatus | null
  hasUnread: boolean
  /** Decision signal for the homeowner. */
  avgRating: number | null
  totalReviews: number
  verified: boolean
  yearsInBusiness: number | null
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
  /** How many companies the job was offered to. */
  matchedCount: number
  /** How many pros opened/viewed the job. */
  viewedCount: number
  interestedCount: number
  quoteCount: number
  /** One row per contractor who started a conversation — each is its own chat. */
  contractors: RequestContractor[]
  /** Present once a contractor completed the job — drives the review prompt. */
  review: {
    projectId: string
    contractorName: string | null
    submitted: boolean
    rating: number | null
  } | null
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
      avgRating: contractors.avgRating,
      totalReviews: contractors.totalReviews,
      verificationStatus: contractors.verificationStatus,
      yearsInBusiness: contractors.yearsInBusiness,
      stage: projects.stage,
    })
    .from(projects)
    .innerJoin(contractors, eq(contractors.id, projects.contractorId))
    .where(eq(projects.leadId, leadId))

  const projectCompleted = projRows.some((p) => p.stage === 'completed')

  // Offer-level counts for the homeowner's "what's next" banner.
  const [matchedRow, viewedRow] = await Promise.all([
    db
      .select({ value: count() })
      .from(leadRecipients)
      .where(eq(leadRecipients.leadId, leadId)),
    db
      .select({ value: count() })
      .from(leadRecipients)
      .where(and(eq(leadRecipients.leadId, leadId), isNotNull(leadRecipients.viewedAt))),
  ])
  const matchedCount = matchedRow[0]?.value ?? 0
  const viewedCount = viewedRow[0]?.value ?? 0

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
      avgRating: p.avgRating ? parseFloat(p.avgRating) : null,
      totalReviews: p.totalReviews,
      verified: p.verificationStatus === 'verified',
      yearsInBusiness: p.yearsInBusiness,
    }
  })

  const interestedCount = contractorList.length
  const quoteCount = contractorList.filter((c) => c.quoteStatus != null).length

  // Review prompt info for the completed job (if any).
  const completedProj = projRows.find((p) => p.stage === 'completed')
  let review: HomeownerRequestDetail['review'] = null
  if (completedProj) {
    const [rev] = await db
      .select({ rating: reviews.rating, submittedAt: reviews.submittedAt })
      .from(reviews)
      .where(eq(reviews.projectId, completedProj.projectId))
      .limit(1)
    review = {
      projectId: completedProj.projectId,
      contractorName: completedProj.contractorName,
      submitted: rev?.submittedAt != null,
      rating: rev?.submittedAt ? (rev.rating ?? null) : null,
    }
  }

  return {
    leadId: lead.id,
    serviceName: lead.serviceName,
    subtype: subtypeLabel(lead.serviceDetails),
    subtypes: subtypeList(lead.serviceDetails),
    status: lead.status,
    requestStatus: deriveRequestStatus({ status: lead.status, interestedCount, quoteCount, projectCompleted }),
    urgency: lead.urgency,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    zipCode: lead.zipCode,
    notes: lead.notes,
    matchedCount,
    viewedCount,
    interestedCount,
    quoteCount,
    contractors: contractorList,
    review,
    createdAt: lead.createdAt,
  }
}

// Homeowner quotes are no longer a standalone page — they're viewed and accepted
// inside each job's chat (QuoteCard) and the request detail. getHomeownerQuotes /
// the Quotes board were removed to declutter the homeowner nav.
