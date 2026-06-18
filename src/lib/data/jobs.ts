// Data layer for the unified "Jobs" board — one card per lead the company was
// offered, spanning the whole lifecycle (offered → engaged → quote → won → done).
//
// The card keys on `lead_recipients` (the only row that exists across the entire
// lifecycle). The board status is DERIVED, never stored — see deriveBoardStatus.
// The `projects` row stays the hidden internal workspace (created at engage); we
// never expose the word "project" in the UI.
//
// NOT cached: pipeline + messaging state change constantly and must be fresh.
// Authorization is scoping every query to the caller's contractorId.

import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contractors,
  estimates,
  homeowners,
  leadRecipients,
  leads,
  projects,
  reviews,
  services,
  users,
} from '@/lib/db/schema'
import { subtypeLabel, subtypeList } from '@/lib/leads/subtype'
import { getConversationForUser, listConversationsForUser } from '@/lib/data/conversations'
import { getProjectConversationId } from '@/lib/messaging/system'
import type { EstimateStatus, EstimateSummary, ProjectStage } from '@/lib/data/projects'

export type RecipientStatus = (typeof leadRecipients.status.enumValues)[number]
export type LeadUrgency = (typeof leads.urgency.enumValues)[number]

/** The five live board columns, plus the hidden `lost` bucket. */
export type BoardStatus = 'new' | 'talking' | 'quoted' | 'won' | 'done' | 'lost'

/**
 * Map the authoritative signals (recipient status + project stage + latest quote
 * status) onto a single board column. No DB column backs this.
 */
export function deriveBoardStatus(args: {
  recipientStatus: RecipientStatus
  projectStage: ProjectStage | null
  latestEstimateStatus: EstimateStatus | null
}): BoardStatus {
  const { recipientStatus, projectStage, latestEstimateStatus } = args
  if (recipientStatus === 'declined' || recipientStatus === 'expired' || recipientStatus === 'lost') {
    return 'lost'
  }
  if (recipientStatus === 'won') {
    return projectStage === 'completed' ? 'done' : 'won'
  }
  if (recipientStatus === 'engaged') {
    if (latestEstimateStatus === 'accepted') return 'won'
    if (latestEstimateStatus === 'sent') return 'quoted'
    return 'talking'
  }
  // offered | viewed — not engaged yet
  return 'new'
}

export type JobCard = {
  leadId: string
  recipientStatus: RecipientStatus
  boardStatus: BoardStatus
  projectId: string | null
  conversationId: string | null
  homeownerName: string | null
  serviceName: string
  subtype: string | null
  subtypes: string[]
  city: string | null
  state: string | null
  zipCode: string | null
  urgency: LeadUrgency
  /** Cost to open the chat with this homeowner, in credits. */
  engagementCreditCost: number
  latestQuoteTotal: string | null
  latestQuoteStatus: EstimateStatus | null
  hasUnread: boolean
  slaDeadline: Date | null
  offeredAt: Date
  engagedAt: Date | null
  awardedAt: Date | null
}

/** Every lead this company was offered, as unified board cards (newest first). */
export async function getContractorJobs(contractorId: string, userId: string): Promise<JobCard[]> {
  const rows = await db
    .select({
      leadId: leads.id,
      recipientStatus: leadRecipients.status,
      urgency: leads.urgency,
      serviceDetails: leads.serviceDetails,
      serviceName: services.name,
      homeownerName: users.fullName,
      city: leads.city,
      state: leads.state,
      zipCode: leads.zipCode,
      engagementCreditCost: leads.engagementCreditCost,
      slaDeadline: leadRecipients.slaDeadline,
      offeredAt: leadRecipients.offeredAt,
      engagedAt: leadRecipients.engagedAt,
      awardedAt: leads.awardedAt,
      projectId: projects.id,
      projectStage: projects.stage,
    })
    .from(leadRecipients)
    .innerJoin(leads, eq(leadRecipients.leadId, leads.id))
    .innerJoin(homeowners, eq(leads.homeownerId, homeowners.id))
    .innerJoin(users, eq(homeowners.userId, users.id))
    .innerJoin(services, eq(leads.serviceId, services.id))
    .leftJoin(projects, and(eq(projects.leadId, leads.id), eq(projects.contractorId, contractorId)))
    .where(eq(leadRecipients.contractorId, contractorId))
    .orderBy(desc(leadRecipients.offeredAt))

  if (rows.length === 0) return []

  const projectIds = rows.map((r) => r.projectId).filter((v): v is string => v !== null)

  // Latest quote per project (one indexed pass).
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

  // Conversation id + unread, keyed by the conversation's contextId (= projectId).
  const summaries = await listConversationsForUser(userId)
  const convByProject = new Map(
    summaries.filter((s) => s.contextId).map((s) => [s.contextId as string, s]),
  )

  return rows.map((r) => {
    const est = r.projectId ? latestByProject.get(r.projectId) : undefined
    const conv = r.projectId ? convByProject.get(r.projectId) : undefined
    return {
      leadId: r.leadId,
      recipientStatus: r.recipientStatus,
      boardStatus: deriveBoardStatus({
        recipientStatus: r.recipientStatus,
        projectStage: r.projectStage,
        latestEstimateStatus: est?.status ?? null,
      }),
      projectId: r.projectId,
      conversationId: conv?.id ?? null,
      homeownerName: r.homeownerName,
      serviceName: r.serviceName,
      subtype: subtypeLabel(r.serviceDetails),
      subtypes: subtypeList(r.serviceDetails),
      city: r.city,
      state: r.state,
      zipCode: r.zipCode,
      urgency: r.urgency,
      engagementCreditCost: r.engagementCreditCost,
      latestQuoteTotal: est?.total ?? null,
      latestQuoteStatus: est?.status ?? null,
      hasUnread: conv?.hasUnread ?? false,
      slaDeadline: r.slaDeadline,
      offeredAt: r.offeredAt,
      engagedAt: r.engagedAt,
      awardedAt: r.awardedAt,
    }
  })
}

export type JobMilestone = { key: string; label: string; at: Date | null }

export type JobDetail = {
  leadId: string
  projectId: string | null
  conversationId: string | null
  boardStatus: BoardStatus
  recipientStatus: RecipientStatus
  homeowner: { name: string | null; phone: string | null; email: string }
  /** The company on this row — decision info shown to the homeowner. */
  contractor: {
    id: string
    companyName: string | null
    logoUrl: string | null
    avgRating: number | null
    totalReviews: number
    verified: boolean
    yearsInBusiness: number | null
  }
  lead: {
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    urgency: LeadUrgency
    subtypes: string[]
    notes: string | null
    photoUrl: string | null
  }
  serviceName: string
  engagementCreditCost: number
  milestones: JobMilestone[]
  latestQuote: { estimateId: string; total: string | null; status: EstimateStatus; sentAt: Date | null } | null
  estimates: EstimateSummary[]
  /** Whether the homeowner has already submitted a review for this job. */
  reviewSubmitted: boolean
  reviewRating: number | null
}

/**
 * Full detail for the right-side Sheet. Anchors on (leadId, contractorId) via
 * lead_recipients, so New/Viewed jobs (no project yet) still resolve.
 */
export async function getJobDetailForContractor(
  leadId: string,
  contractorId: string,
): Promise<JobDetail | null> {
  const [row] = await db
    .select({
      leadId: leads.id,
      recipientStatus: leadRecipients.status,
      offeredAt: leadRecipients.offeredAt,
      viewedAt: leadRecipients.viewedAt,
      engagedAt: leadRecipients.engagedAt,
      awardedAt: leads.awardedAt,
      address: leads.address,
      city: leads.city,
      state: leads.state,
      zipCode: leads.zipCode,
      urgency: leads.urgency,
      serviceDetails: leads.serviceDetails,
      notes: leads.notes,
      photoUrl: leads.photoUrl,
      engagementCreditCost: leads.engagementCreditCost,
      serviceName: services.name,
      homeownerName: users.fullName,
      homeownerPhone: users.phone,
      homeownerEmail: users.email,
      contractorCompanyName: contractors.companyName,
      contractorLogoUrl: contractors.logoUrl,
      contractorAvgRating: contractors.avgRating,
      contractorTotalReviews: contractors.totalReviews,
      contractorVerification: contractors.verificationStatus,
      contractorYears: contractors.yearsInBusiness,
      projectId: projects.id,
      projectStage: projects.stage,
      projectStageUpdatedAt: projects.stageUpdatedAt,
    })
    .from(leadRecipients)
    .innerJoin(leads, eq(leadRecipients.leadId, leads.id))
    .innerJoin(homeowners, eq(leads.homeownerId, homeowners.id))
    .innerJoin(users, eq(homeowners.userId, users.id))
    .innerJoin(services, eq(leads.serviceId, services.id))
    .innerJoin(contractors, eq(contractors.id, leadRecipients.contractorId))
    .leftJoin(projects, and(eq(projects.leadId, leads.id), eq(projects.contractorId, contractorId)))
    .where(and(eq(leadRecipients.leadId, leadId), eq(leadRecipients.contractorId, contractorId)))
    .limit(1)
  if (!row) return null

  const [estimateRows, conversationId, reviewRows] = await Promise.all([
    row.projectId
      ? db
          .select({
            id: estimates.id,
            status: estimates.status,
            subtotal: estimates.subtotal,
            taxAmount: estimates.taxAmount,
            total: estimates.total,
            lineItems: estimates.lineItems,
            scopeNotes: estimates.scopeNotes,
            validUntil: estimates.validUntil,
            sentAt: estimates.sentAt,
            acceptedAt: estimates.acceptedAt,
            createdAt: estimates.createdAt,
          })
          .from(estimates)
          .where(eq(estimates.projectId, row.projectId))
          .orderBy(desc(estimates.createdAt))
      : Promise.resolve([]),
    row.projectId ? getProjectConversationId(row.projectId) : Promise.resolve(null),
    row.projectId
      ? db
          .select({ rating: reviews.rating, submittedAt: reviews.submittedAt })
          .from(reviews)
          .where(eq(reviews.projectId, row.projectId))
          .limit(1)
      : Promise.resolve([]),
  ])
  const review = reviewRows[0] ?? null
  const reviewSubmitted = review?.submittedAt != null

  const latest = estimateRows[0] ?? null
  const lastSent = estimateRows.find((e) => e.sentAt != null) ?? null
  const accepted = estimateRows.find((e) => e.acceptedAt != null) ?? null

  const milestones: JobMilestone[] = [
    { key: 'offered', label: 'Lead received', at: row.offeredAt },
    { key: 'viewed', label: 'Viewed', at: row.viewedAt },
    { key: 'chat', label: 'Chat started', at: row.engagedAt },
    { key: 'quoted', label: 'Quote sent', at: lastSent?.sentAt ?? null },
    { key: 'won', label: 'Hired', at: accepted?.acceptedAt ?? row.awardedAt ?? null },
    {
      key: 'completed',
      label: 'Completed',
      at: row.projectStage === 'completed' ? row.projectStageUpdatedAt : null,
    },
  ]

  return {
    leadId: row.leadId,
    projectId: row.projectId,
    conversationId,
    boardStatus: deriveBoardStatus({
      recipientStatus: row.recipientStatus,
      projectStage: row.projectStage,
      latestEstimateStatus: latest?.status ?? null,
    }),
    recipientStatus: row.recipientStatus,
    homeowner: {
      name: row.homeownerName,
      phone: row.homeownerPhone,
      email: row.homeownerEmail,
    },
    contractor: {
      id: contractorId,
      companyName: row.contractorCompanyName,
      logoUrl: row.contractorLogoUrl,
      avgRating: row.contractorAvgRating ? parseFloat(row.contractorAvgRating) : null,
      totalReviews: row.contractorTotalReviews,
      verified: row.contractorVerification === 'verified',
      yearsInBusiness: row.contractorYears,
    },
    lead: {
      address: row.address,
      city: row.city,
      state: row.state,
      zipCode: row.zipCode,
      urgency: row.urgency,
      subtypes: subtypeList(row.serviceDetails),
      notes: row.notes,
      photoUrl: row.photoUrl,
    },
    serviceName: row.serviceName,
    engagementCreditCost: row.engagementCreditCost,
    milestones,
    latestQuote: latest
      ? { estimateId: latest.id, total: latest.total, status: latest.status, sentAt: latest.sentAt }
      : null,
    estimates: estimateRows.map((e) => ({
      id: e.id,
      status: e.status,
      subtotal: e.subtotal,
      taxAmount: e.taxAmount,
      total: e.total,
      lineItems: e.lineItems,
      scopeNotes: e.scopeNotes,
      validUntil: e.validUntil,
      sentAt: e.sentAt,
      createdAt: e.createdAt,
    })),
    reviewSubmitted,
    reviewRating: reviewSubmitted ? (review?.rating ?? null) : null,
  }
}

export type JobPanel = {
  conversationId: string
  viewerRole: 'contractor' | 'homeowner'
  /** Contractor can send/update a quote (engaged, not yet hired). */
  canQuote: boolean
  /** Homeowner can accept the pending quote. */
  canAccept: boolean
  /** Contractor can mark the won job completed. */
  canComplete: boolean
  /** Homeowner can leave a review (job done, not yet reviewed). */
  canReview: boolean
  detail: JobDetail
}

/**
 * The control-room panel for a conversation — same job detail as the Sheet, plus
 * the actions the viewer is allowed to take. Authorization is the participant
 * check inside getConversationForUser (works for BOTH the homeowner and the
 * contractor's members), NOT a contractor-scoped query.
 */
export async function getJobPanelForConversation(
  conversationId: string,
  userId: string,
): Promise<JobPanel | null> {
  const convo = await getConversationForUser(conversationId, userId)
  if (!convo || convo.contextType !== 'project' || !convo.contextId) return null

  const [proj] = await db
    .select({ leadId: projects.leadId, contractorId: projects.contractorId })
    .from(projects)
    .where(eq(projects.id, convo.contextId))
    .limit(1)
  if (!proj?.leadId) return null

  const detail = await getJobDetailForContractor(proj.leadId, proj.contractorId)
  if (!detail) return null

  const viewerRole = convo.me.type === 'contractor' ? 'contractor' : 'homeowner'
  return {
    conversationId,
    viewerRole,
    canQuote: viewerRole === 'contractor' && (detail.boardStatus === 'talking' || detail.boardStatus === 'quoted'),
    canAccept: viewerRole === 'homeowner' && detail.latestQuote?.status === 'sent',
    canComplete: viewerRole === 'contractor' && detail.boardStatus === 'won',
    canReview: viewerRole === 'homeowner' && detail.boardStatus === 'done' && !detail.reviewSubmitted,
    detail,
  }
}
