// Data layer for the admin console (v2). Privileged Drizzle connection (RLS
// bypassed); admin authorization is enforced by the caller (getRequiredUser('admin')).
// NOT cached — verification state and counts must be fresh.

import { db } from '@/lib/db'
import { and, count, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import {
  contractors,
  contractorMembers,
  creditTransactions,
  estimates,
  homeowners,
  leadRecipients,
  leads,
  projects,
  purchaseIntents,
  services,
  stormEvents,
  users,
} from '@/lib/db/schema'

export type VerificationQueueItem = {
  contractorId: string
  companyName: string | null
  licenseNumber: string | null
  licenseDocUrl: string | null
  insuranceProvider: string | null
  insuranceDocUrl: string | null
  ownerName: string | null
  ownerEmail: string | null
  submittedAt: Date
}

/**
 * Companies awaiting verification: status `pending` with BOTH documents
 * uploaded (matches the "in_review" state in getVerificationState). Oldest
 * first — admins work the queue front-to-back.
 */
export async function getVerificationQueue(): Promise<VerificationQueueItem[]> {
  const rows = await db
    .select({
      contractorId: contractors.id,
      companyName: contractors.companyName,
      licenseNumber: contractors.licenseNumber,
      licenseDocUrl: contractors.licenseDocUrl,
      insuranceProvider: contractors.insuranceProvider,
      insuranceDocUrl: contractors.insuranceDocUrl,
      ownerName: users.fullName,
      ownerEmail: users.email,
      submittedAt: contractors.createdAt,
    })
    .from(contractors)
    .leftJoin(
      contractorMembers,
      and(
        eq(contractorMembers.contractorId, contractors.id),
        eq(contractorMembers.role, 'owner'),
      ),
    )
    .leftJoin(users, eq(users.id, contractorMembers.userId))
    .where(
      and(
        eq(contractors.verificationStatus, 'pending'),
        isNotNull(contractors.licenseDocUrl),
        isNotNull(contractors.insuranceDocUrl),
      ),
    )
    .orderBy(contractors.createdAt)

  return rows
}

export type AdminStats = {
  pendingVerifications: number
  verifiedContractors: number
  totalContractors: number
}

export async function getAdminStats(): Promise<AdminStats> {
  const [pending, verified, total] = await Promise.all([
    db
      .select({ value: count() })
      .from(contractors)
      .where(
        and(
          eq(contractors.verificationStatus, 'pending'),
          isNotNull(contractors.licenseDocUrl),
          isNotNull(contractors.insuranceDocUrl),
        ),
      ),
    db
      .select({ value: count() })
      .from(contractors)
      .where(eq(contractors.verificationStatus, 'verified')),
    db.select({ value: count() }).from(contractors),
  ])

  return {
    pendingVerifications: pending[0]?.value ?? 0,
    verifiedContractors: verified[0]?.value ?? 0,
    totalContractors: total[0]?.value ?? 0,
  }
}

export type RecentContractor = {
  id: string
  companyName: string | null
  verificationStatus: (typeof contractors.verificationStatus.enumValues)[number]
  createdAt: Date
}

/** Newest companies, for the admin overview. */
export async function getRecentContractors(
  limit = 8,
): Promise<RecentContractor[]> {
  return db
    .select({
      id: contractors.id,
      companyName: contractors.companyName,
      verificationStatus: contractors.verificationStatus,
      createdAt: contractors.createdAt,
    })
    .from(contractors)
    .orderBy(desc(contractors.createdAt))
    .limit(limit)
}

export type PurchaseIntentRow = {
  id: string
  contractorId: string
  companyName: string | null
  currentBalance: number
  credits: number
  amountCents: number
  balanceAtRequest: number
  status: (typeof purchaseIntents.status.enumValues)[number]
  requestedByName: string | null
  requestedByEmail: string | null
  createdAt: Date
}

/**
 * Credit-purchase requests (v1 manual settlement). Newest first; the page shows
 * `requested` ones with a Grant action and keeps fulfilled/declined as history.
 */
export async function getPurchaseIntents(limit = 100): Promise<PurchaseIntentRow[]> {
  return db
    .select({
      id: purchaseIntents.id,
      contractorId: purchaseIntents.contractorId,
      companyName: contractors.companyName,
      currentBalance: contractors.creditBalance,
      credits: purchaseIntents.credits,
      amountCents: purchaseIntents.amountCents,
      balanceAtRequest: purchaseIntents.balanceAtRequest,
      status: purchaseIntents.status,
      requestedByName: users.fullName,
      requestedByEmail: users.email,
      createdAt: purchaseIntents.createdAt,
    })
    .from(purchaseIntents)
    .innerJoin(contractors, eq(contractors.id, purchaseIntents.contractorId))
    .leftJoin(users, eq(users.id, purchaseIntents.requestedBy))
    .orderBy(desc(purchaseIntents.createdAt))
    .limit(limit)
}

// ── Cross-company oversight (admin-only; auth enforced at the page) ───────────
// Every fn below is UNSCOPED (all companies) — only ever call from an
// admin-guarded server component. Capped at ADMIN_LIST_LIMIT rows; add pagination
// when a marketplace outgrows it.
const ADMIN_LIST_LIMIT = 200

type LeadStatus = (typeof leads.status.enumValues)[number]
type LeadUrgency = (typeof leads.urgency.enumValues)[number]
type ProjectStage = (typeof projects.stage.enumValues)[number]
type EstimateStatus = (typeof estimates.status.enumValues)[number]
type CreditKind = (typeof creditTransactions.kind.enumValues)[number]
type VerificationStatus = (typeof contractors.verificationStatus.enumValues)[number]
type MemberRole = (typeof contractorMembers.role.enumValues)[number]
type MemberStatus = (typeof contractorMembers.status.enumValues)[number]

function subtypeOf(serviceDetails: unknown): string | null {
  return (serviceDetails as { subtypes?: string[] } | null)?.subtypes?.[0] ?? null
}

export type AdminLeadRow = {
  id: string
  homeownerName: string | null
  title: string
  city: string | null
  state: string | null
  urgency: LeadUrgency
  status: LeadStatus
  recipientCount: number
  engagedCount: number
  awardedToName: string | null
  createdAt: Date
}

/** Every lead across the marketplace, newest first, with recipient counts. */
export async function getAdminLeads(): Promise<AdminLeadRow[]> {
  const rows = await db
    .select({
      id: leads.id,
      homeownerName: users.fullName,
      serviceName: services.name,
      serviceDetails: leads.serviceDetails,
      city: leads.city,
      state: leads.state,
      urgency: leads.urgency,
      status: leads.status,
      awardedToName: contractors.companyName,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .innerJoin(homeowners, eq(homeowners.id, leads.homeownerId))
    .innerJoin(users, eq(users.id, homeowners.userId))
    .innerJoin(services, eq(services.id, leads.serviceId))
    .leftJoin(contractors, eq(contractors.id, leads.awardedTo))
    .orderBy(desc(leads.createdAt))
    .limit(ADMIN_LIST_LIMIT)

  const ids = rows.map((r) => r.id)
  const recipients = ids.length
    ? await db
        .select({ leadId: leadRecipients.leadId, status: leadRecipients.status })
        .from(leadRecipients)
        .where(inArray(leadRecipients.leadId, ids))
    : []
  const counts = new Map<string, { total: number; engaged: number }>()
  for (const r of recipients) {
    const cur = counts.get(r.leadId) ?? { total: 0, engaged: 0 }
    cur.total += 1
    if (r.status === 'engaged' || r.status === 'won') cur.engaged += 1
    counts.set(r.leadId, cur)
  }

  return rows.map((r) => ({
    id: r.id,
    homeownerName: r.homeownerName,
    title: subtypeOf(r.serviceDetails) ?? r.serviceName,
    city: r.city,
    state: r.state,
    urgency: r.urgency,
    status: r.status,
    recipientCount: counts.get(r.id)?.total ?? 0,
    engagedCount: counts.get(r.id)?.engaged ?? 0,
    awardedToName: r.awardedToName,
    createdAt: r.createdAt,
  }))
}

export type AdminContractorRow = {
  id: string
  companyName: string | null
  verificationStatus: VerificationStatus
  memberCount: number
  creditBalance: number
  profileScore: number
  avgRating: string | null
  totalReviews: number
  createdAt: Date
}

/** Every company, newest first, with active-member counts. */
export async function getAdminContractors(): Promise<AdminContractorRow[]> {
  const rows = await db
    .select({
      id: contractors.id,
      companyName: contractors.companyName,
      verificationStatus: contractors.verificationStatus,
      creditBalance: contractors.creditBalance,
      profileScore: contractors.profileScore,
      avgRating: contractors.avgRating,
      totalReviews: contractors.totalReviews,
      createdAt: contractors.createdAt,
    })
    .from(contractors)
    .orderBy(desc(contractors.createdAt))
    .limit(ADMIN_LIST_LIMIT)

  const ids = rows.map((r) => r.id)
  const members = ids.length
    ? await db
        .select({ contractorId: contractorMembers.contractorId })
        .from(contractorMembers)
        .where(and(inArray(contractorMembers.contractorId, ids), eq(contractorMembers.status, 'active')))
    : []
  const memberCounts = new Map<string, number>()
  for (const m of members) memberCounts.set(m.contractorId, (memberCounts.get(m.contractorId) ?? 0) + 1)

  return rows.map((r) => ({ ...r, memberCount: memberCounts.get(r.id) ?? 0 }))
}

export type AdminContractorMember = {
  name: string | null
  email: string
  role: MemberRole
  status: MemberStatus
}

export type AdminContractorDetail = {
  id: string
  companyName: string | null
  verificationStatus: VerificationStatus
  creditBalance: number
  profileScore: number
  avgRating: string | null
  totalReviews: number
  licenseNumber: string | null
  insuranceProvider: string | null
  yearsInBusiness: number | null
  createdAt: Date
  members: AdminContractorMember[]
}

/** One company's full record + its members, for the admin detail dialog. */
export async function getAdminContractorDetail(contractorId: string): Promise<AdminContractorDetail | null> {
  const [c] = await db
    .select({
      id: contractors.id,
      companyName: contractors.companyName,
      verificationStatus: contractors.verificationStatus,
      creditBalance: contractors.creditBalance,
      profileScore: contractors.profileScore,
      avgRating: contractors.avgRating,
      totalReviews: contractors.totalReviews,
      licenseNumber: contractors.licenseNumber,
      insuranceProvider: contractors.insuranceProvider,
      yearsInBusiness: contractors.yearsInBusiness,
      createdAt: contractors.createdAt,
    })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1)
  if (!c) return null

  const members = await db
    .select({
      name: users.fullName,
      email: users.email,
      role: contractorMembers.role,
      status: contractorMembers.status,
    })
    .from(contractorMembers)
    .innerJoin(users, eq(users.id, contractorMembers.userId))
    .where(eq(contractorMembers.contractorId, contractorId))
    .orderBy(contractorMembers.createdAt)

  return { ...c, members }
}

export type AdminQuoteRow = {
  estimateId: string
  companyName: string | null
  homeownerName: string | null
  total: string | null
  status: EstimateStatus
  sentAt: Date | null
  acceptedAt: Date | null
  createdAt: Date
}

/** Every quote (estimate) across the marketplace, newest first. */
export async function getAdminQuotes(): Promise<AdminQuoteRow[]> {
  return db
    .select({
      estimateId: estimates.id,
      companyName: contractors.companyName,
      homeownerName: users.fullName,
      total: estimates.total,
      status: estimates.status,
      sentAt: estimates.sentAt,
      acceptedAt: estimates.acceptedAt,
      createdAt: estimates.createdAt,
    })
    .from(estimates)
    .innerJoin(projects, eq(projects.id, estimates.projectId))
    .innerJoin(contractors, eq(contractors.id, projects.contractorId))
    .leftJoin(leads, eq(leads.id, projects.leadId))
    .leftJoin(homeowners, eq(homeowners.id, leads.homeownerId))
    .leftJoin(users, eq(users.id, homeowners.userId))
    .orderBy(desc(estimates.createdAt))
    .limit(ADMIN_LIST_LIMIT)
}

export type AdminJobRow = {
  projectId: string
  companyName: string | null
  homeownerName: string | null
  title: string
  stage: ProjectStage
  estimateValue: string | null
  createdAt: Date
}

/** Every job (project) across the marketplace, newest first. */
export async function getAdminJobs(): Promise<AdminJobRow[]> {
  const rows = await db
    .select({
      projectId: projects.id,
      companyName: contractors.companyName,
      homeownerName: users.fullName,
      serviceName: services.name,
      serviceDetails: leads.serviceDetails,
      stage: projects.stage,
      estimateValue: projects.estimateValue,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .innerJoin(contractors, eq(contractors.id, projects.contractorId))
    .innerJoin(services, eq(services.id, projects.serviceId))
    .leftJoin(leads, eq(leads.id, projects.leadId))
    .leftJoin(homeowners, eq(homeowners.id, leads.homeownerId))
    .leftJoin(users, eq(users.id, homeowners.userId))
    .orderBy(desc(projects.createdAt))
    .limit(ADMIN_LIST_LIMIT)

  return rows.map((r) => ({
    projectId: r.projectId,
    companyName: r.companyName,
    homeownerName: r.homeownerName,
    title: subtypeOf(r.serviceDetails) ?? r.serviceName,
    stage: r.stage,
    estimateValue: r.estimateValue,
    createdAt: r.createdAt,
  }))
}

export type AdminStormEvent = {
  id: string
  eventType: (typeof stormEvents.eventType.enumValues)[number]
  severity: string | null
  affectedZipCodes: string[]
  detectedAt: Date
  alertsSent: number
  leadsGenerated: number
}

/** Storm events (roofing module), newest first. */
export async function getAdminStormEvents(): Promise<AdminStormEvent[]> {
  return db
    .select({
      id: stormEvents.id,
      eventType: stormEvents.eventType,
      severity: stormEvents.severity,
      affectedZipCodes: stormEvents.affectedZipCodes,
      detectedAt: stormEvents.detectedAt,
      alertsSent: stormEvents.alertsSent,
      leadsGenerated: stormEvents.leadsGenerated,
    })
    .from(stormEvents)
    .orderBy(desc(stormEvents.detectedAt))
    .limit(ADMIN_LIST_LIMIT)
}

export type AdminCreditLogRow = {
  id: string
  companyName: string | null
  kind: CreditKind
  amount: number
  balanceAfter: number
  createdByName: string | null
  sourceType: string | null
  createdAt: Date
}

/** The money-movement trail across all companies — the de-facto audit log. */
export async function getAdminCreditLog(): Promise<AdminCreditLogRow[]> {
  return db
    .select({
      id: creditTransactions.id,
      companyName: contractors.companyName,
      kind: creditTransactions.kind,
      amount: creditTransactions.amount,
      balanceAfter: creditTransactions.balanceAfter,
      createdByName: users.fullName,
      sourceType: creditTransactions.sourceType,
      createdAt: creditTransactions.createdAt,
    })
    .from(creditTransactions)
    .innerJoin(contractors, eq(contractors.id, creditTransactions.contractorId))
    .leftJoin(users, eq(users.id, creditTransactions.createdBy))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(ADMIN_LIST_LIMIT)
}
