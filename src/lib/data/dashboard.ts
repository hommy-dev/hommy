// Data layer for the contractor dashboard (v2).
//
// NOT cached ("use cache"): offers, counts, and pipeline state change constantly
// and must be fresh (CODING_GUIDE.md §4). Runs on the privileged Drizzle
// connection (RLS bypassed); authorization is enforced by scoping every query to
// the caller's contractorId — resolved from their active membership.

import { cache } from 'react'
import { db } from '@/lib/db'
import { and, count, desc, eq, getTableColumns, inArray } from 'drizzle-orm'
import {
  contractors,
  contractorMembers,
  contractorServices,
  homeowners,
  leadRecipients,
  leads,
  projects,
  serviceAreas,
  services,
  users,
} from '@/lib/db/schema'
import { subtypeLabel, subtypeList } from '@/lib/leads/subtype'

export type Contractor = typeof contractors.$inferSelect

/**
 * The company a user is currently operating as. A user can belong to several
 * companies; `users.active_contractor_id` selects which one, falling back to
 * their first active membership when it's null or no longer valid (e.g. they
 * were removed from it). Returns null only when they belong to no company.
 */
// React cache() dedupes per request — the dashboard layout and the page both
// resolve the active company, so without this it runs twice (2 queries each).
export const getContractorForUser = cache(async (
  userId: string,
): Promise<Contractor | null> => {
  const rows = await db
    .select(getTableColumns(contractors))
    .from(contractors)
    .innerJoin(contractorMembers, eq(contractorMembers.contractorId, contractors.id))
    .where(
      and(
        eq(contractorMembers.userId, userId),
        eq(contractorMembers.status, 'active'),
      ),
    )
    .orderBy(contractorMembers.createdAt)
  if (rows.length === 0) return null

  const [u] = await db
    .select({ activeId: users.activeContractorId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const active = u?.activeId ? rows.find((r) => r.id === u.activeId) : undefined
  return active ?? rows[0]
})

export type UserCompany = {
  id: string
  name: string | null
  logoUrl: string | null
  role: MemberRole
}

/** Every company the user is an active member of — for the workspace switcher. */
export async function getUserCompanies(userId: string): Promise<UserCompany[]> {
  return db
    .select({
      id: contractors.id,
      name: contractors.companyName,
      logoUrl: contractors.logoUrl,
      role: contractorMembers.role,
    })
    .from(contractors)
    .innerJoin(contractorMembers, eq(contractorMembers.contractorId, contractors.id))
    .where(
      and(
        eq(contractorMembers.userId, userId),
        eq(contractorMembers.status, 'active'),
      ),
    )
    .orderBy(contractorMembers.createdAt)
}

export type MemberRole = (typeof contractorMembers.role.enumValues)[number]

/** The viewer's role within a company — gates who can edit company settings. */
export const getMembershipRole = cache(async (
  userId: string,
  contractorId: string,
): Promise<MemberRole | null> => {
  const [row] = await db
    .select({ role: contractorMembers.role })
    .from(contractorMembers)
    .where(
      and(
        eq(contractorMembers.userId, userId),
        eq(contractorMembers.contractorId, contractorId),
        eq(contractorMembers.status, 'active'),
      ),
    )
    .limit(1)
  return row?.role ?? null
})

export type ServiceArea = {
  id: string
  label: string | null
  areaType: "circle" | "polygon"
  lat: number | null
  lng: number | null
  radiusKm: number | null
  polygon: { lat: number; lng: number }[] | null
}

/** The company's coverage areas (circle or polygon), oldest first. */
export async function getServiceAreas(
  contractorId: string,
): Promise<ServiceArea[]> {
  const rows = await db
    .select({
      id: serviceAreas.id,
      label: serviceAreas.label,
      areaType: serviceAreas.areaType,
      lat: serviceAreas.lat,
      lng: serviceAreas.lng,
      radiusKm: serviceAreas.radiusKm,
      polygon: serviceAreas.polygon,
    })
    .from(serviceAreas)
    .where(eq(serviceAreas.contractorId, contractorId))
    .orderBy(serviceAreas.createdAt)
  return rows.map((r) => ({
    ...r,
    areaType: r.areaType === "polygon" ? "polygon" : "circle",
    polygon: r.polygon ?? null,
  }))
}

/** The roofing subtypes this company handles. */
export async function getContractorSubtypes(
  contractorId: string,
): Promise<string[]> {
  const [row] = await db
    .select({ subtypes: contractorServices.subtypes })
    .from(contractorServices)
    .innerJoin(services, eq(services.id, contractorServices.serviceId))
    .where(
      and(
        eq(contractorServices.contractorId, contractorId),
        eq(services.slug, 'roofing'),
      ),
    )
    .limit(1)
  return row?.subtypes ?? []
}

/** All subtypes the roofing service offers (the pick-from list). */
export async function getRoofingSubtypes(): Promise<string[]> {
  const [row] = await db
    .select({ subtypes: services.subtypes })
    .from(services)
    .where(eq(services.slug, 'roofing'))
    .limit(1)
  return row?.subtypes ?? []
}

export type DashboardLead = {
  id: string
  recipientStatus: (typeof leadRecipients.status.enumValues)[number]
  leadStatus: (typeof leads.status.enumValues)[number]
  urgency: (typeof leads.urgency.enumValues)[number]
  subtype: string | null
  subtypes: string[]
  notes: string | null
  photoUrl: string | null
  serviceName: string
  homeownerName: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  /** Cost to engage this lead, in credits. */
  engagementCreditCost: number
  /** Max contractors that may engage (capped competition). */
  engageSlots: number
  /** How many have already engaged — slotsUsed of engageSlots. */
  slotsUsed: number
  /** When this offer expires under the SLA (drives the countdown). */
  slaDeadline: Date | null
  offeredAt: Date
  /** When this company engaged the lead (null if not yet). */
  engagedAt: Date | null
  /** When the lead was awarded (to anyone) — used for win trends. */
  awardedAt: Date | null
  createdAt: Date
}

/** Leads offered to this company (the fan-out), newest offer first. */
export async function getContractorLeads(
  contractorId: string,
): Promise<DashboardLead[]> {
  const rows = await db
    .select({
      id: leads.id,
      recipientStatus: leadRecipients.status,
      leadStatus: leads.status,
      urgency: leads.urgency,
      serviceDetails: leads.serviceDetails,
      notes: leads.notes,
      photoUrl: leads.photoUrl,
      serviceName: services.name,
      homeownerName: users.fullName,
      city: leads.city,
      state: leads.state,
      zipCode: leads.zipCode,
      engagementCreditCost: leads.engagementCreditCost,
      engageSlots: leads.engageSlots,
      slaDeadline: leadRecipients.slaDeadline,
      offeredAt: leadRecipients.offeredAt,
      engagedAt: leadRecipients.engagedAt,
      awardedAt: leads.awardedAt,
      createdAt: leads.createdAt,
    })
    .from(leadRecipients)
    .innerJoin(leads, eq(leadRecipients.leadId, leads.id))
    .innerJoin(homeowners, eq(leads.homeownerId, homeowners.id))
    .innerJoin(users, eq(homeowners.userId, users.id))
    .innerJoin(services, eq(leads.serviceId, services.id))
    .where(eq(leadRecipients.contractorId, contractorId))
    .orderBy(desc(leadRecipients.offeredAt))

  if (rows.length === 0) return []

  // How many companies have engaged each lead (the filled slots).
  const used = await db
    .select({ leadId: leadRecipients.leadId, value: count() })
    .from(leadRecipients)
    .where(
      and(
        inArray(
          leadRecipients.leadId,
          rows.map((r) => r.id),
        ),
        inArray(leadRecipients.status, ['engaged', 'won']),
      ),
    )
    .groupBy(leadRecipients.leadId)
  const usedByLead = new Map(used.map((u) => [u.leadId, u.value]))

  return rows.map((r) => ({
    id: r.id,
    recipientStatus: r.recipientStatus,
    leadStatus: r.leadStatus,
    urgency: r.urgency,
    subtype: subtypeLabel(r.serviceDetails),
    subtypes: subtypeList(r.serviceDetails),
    notes: r.notes,
    photoUrl: r.photoUrl,
    serviceName: r.serviceName,
    homeownerName: r.homeownerName,
    city: r.city,
    state: r.state,
    zipCode: r.zipCode,
    engagementCreditCost: r.engagementCreditCost,
    engageSlots: r.engageSlots,
    slotsUsed: usedByLead.get(r.id) ?? 0,
    slaDeadline: r.slaDeadline,
    offeredAt: r.offeredAt,
    engagedAt: r.engagedAt,
    awardedAt: r.awardedAt,
    createdAt: r.createdAt,
  }))
}

const OPEN_OFFER_STATUSES = ['offered', 'viewed', 'engaged'] as const
const ACTIVE_PROJECT_STAGES = ['new_lead', 'contacted', 'estimate_sent', 'in_progress'] as const

export type DashboardStats = {
  openOffers: number
  activeProjects: number
}

export async function getDashboardStats(
  contractorId: string,
): Promise<DashboardStats> {
  const [offerRows, projectRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(leadRecipients)
      .where(
        and(
          eq(leadRecipients.contractorId, contractorId),
          inArray(leadRecipients.status, [...OPEN_OFFER_STATUSES]),
        ),
      ),
    db
      .select({ value: count() })
      .from(projects)
      .where(
        and(
          eq(projects.contractorId, contractorId),
          inArray(projects.stage, [...ACTIVE_PROJECT_STAGES]),
        ),
      ),
  ])

  return {
    openOffers: offerRows[0]?.value ?? 0,
    activeProjects: projectRows[0]?.value ?? 0,
  }
}

export type SetupStatus = { hasServices: boolean; hasAreas: boolean }

export async function getSetupStatus(contractorId: string): Promise<SetupStatus> {
  const [svcRows, areaRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(contractorServices)
      .where(eq(contractorServices.contractorId, contractorId)),
    db
      .select({ value: count() })
      .from(serviceAreas)
      .where(eq(serviceAreas.contractorId, contractorId)),
  ])
  return {
    hasServices: (svcRows[0]?.value ?? 0) > 0,
    hasAreas: (areaRows[0]?.value ?? 0) > 0,
  }
}
