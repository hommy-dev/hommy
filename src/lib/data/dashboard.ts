// Data layer for the contractor dashboard (v2).
//
// NOT cached ("use cache"): offers, counts, and pipeline state change constantly
// and must be fresh (CODING_GUIDE.md §4). Runs on the privileged Drizzle
// connection (RLS bypassed); authorization is enforced by scoping every query to
// the caller's contractorId — resolved from their active membership.

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
import { subtypeLabel } from '@/lib/leads/subtype'

export type Contractor = typeof contractors.$inferSelect

/** Map an authenticated user → the company they actively belong to (one for now). */
export async function getContractorForUser(
  userId: string,
): Promise<Contractor | null> {
  const [row] = await db
    .select(getTableColumns(contractors))
    .from(contractors)
    .innerJoin(contractorMembers, eq(contractorMembers.contractorId, contractors.id))
    .where(
      and(
        eq(contractorMembers.userId, userId),
        eq(contractorMembers.status, 'active'),
      ),
    )
    .limit(1)
  return row ?? null
}

export type DashboardLead = {
  id: string
  recipientStatus: (typeof leadRecipients.status.enumValues)[number]
  urgency: (typeof leads.urgency.enumValues)[number]
  subtype: string | null
  notes: string | null
  serviceName: string
  homeownerName: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  offeredAt: Date
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
      urgency: leads.urgency,
      serviceDetails: leads.serviceDetails,
      notes: leads.notes,
      serviceName: services.name,
      homeownerName: users.fullName,
      city: leads.city,
      state: leads.state,
      zipCode: leads.zipCode,
      offeredAt: leadRecipients.offeredAt,
      createdAt: leads.createdAt,
    })
    .from(leadRecipients)
    .innerJoin(leads, eq(leadRecipients.leadId, leads.id))
    .innerJoin(homeowners, eq(leads.homeownerId, homeowners.id))
    .innerJoin(users, eq(homeowners.userId, users.id))
    .innerJoin(services, eq(leads.serviceId, services.id))
    .where(eq(leadRecipients.contractorId, contractorId))
    .orderBy(desc(leadRecipients.offeredAt))

  return rows.map((r) => {
    const subtype = subtypeLabel(r.serviceDetails)
    return {
      id: r.id,
      recipientStatus: r.recipientStatus,
      urgency: r.urgency,
      subtype,
      notes: r.notes,
      serviceName: r.serviceName,
      homeownerName: r.homeownerName,
      city: r.city,
      state: r.state,
      zipCode: r.zipCode,
      offeredAt: r.offeredAt,
      createdAt: r.createdAt,
    }
  })
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
