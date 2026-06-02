// Data layer for the contractor dashboard.
//
// These functions are intentionally NOT cached ("use cache"): leads, counts,
// and pipeline state change constantly and the contractor must see them fresh
// (see CODING_GUIDE.md §4 — "lead counts are NOT cached"). They run on the
// privileged Drizzle connection, so RLS does not apply here; authorization is
// enforced by scoping every query to the caller's contractorId.

import { db } from '@/lib/db'
import { and, count, desc, eq, inArray } from 'drizzle-orm'
import {
  contractors,
  homeowners,
  leads,
  projects,
  services,
} from '@/lib/db/schema'

export type Contractor = typeof contractors.$inferSelect

/** Map an authenticated user → their contractor row (one per user). */
export async function getContractorForUser(
  userId: string,
): Promise<Contractor | null> {
  const [row] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.userId, userId))
    .limit(1)
  return row ?? null
}

export type DashboardLead = {
  id: string
  status: (typeof leads.status.enumValues)[number]
  urgency: (typeof leads.urgency.enumValues)[number]
  subtype: string | null
  notes: string | null
  serviceName: string
  homeownerName: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  assignedAt: Date | null
  createdAt: Date
}

/** Exclusive leads assigned to this contractor, newest first. */
export async function getContractorLeads(
  contractorId: string,
): Promise<DashboardLead[]> {
  const rows = await db
    .select({
      id: leads.id,
      status: leads.status,
      urgency: leads.urgency,
      serviceDetails: leads.serviceDetails,
      notes: leads.notes,
      serviceName: services.name,
      homeownerName: homeowners.fullName,
      city: homeowners.city,
      state: homeowners.state,
      zipCode: homeowners.zipCode,
      assignedAt: leads.assignedAt,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .innerJoin(homeowners, eq(leads.homeownerId, homeowners.id))
    .innerJoin(services, eq(leads.serviceId, services.id))
    .where(eq(leads.assignedTo, contractorId))
    .orderBy(desc(leads.assignedAt), desc(leads.createdAt))

  return rows.map((r) => {
    const subtype = r.serviceDetails?.subtype
    return {
      id: r.id,
      status: r.status,
      urgency: r.urgency,
      subtype: typeof subtype === 'string' ? subtype : null,
      notes: r.notes,
      serviceName: r.serviceName,
      homeownerName: r.homeownerName,
      city: r.city,
      state: r.state,
      zipCode: r.zipCode,
      assignedAt: r.assignedAt,
      createdAt: r.createdAt,
    }
  })
}

const ACTIVE_PROJECT_STAGES = [
  'new_lead',
  'contacted',
  'estimate_sent',
  'in_progress',
] as const

export type DashboardStats = {
  assignedLeads: number
  activeProjects: number
}

export async function getDashboardStats(
  contractorId: string,
): Promise<DashboardStats> {
  const [leadRows, projectRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(leads)
      .where(eq(leads.assignedTo, contractorId)),
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
    assignedLeads: leadRows[0]?.value ?? 0,
    activeProjects: projectRows[0]?.value ?? 0,
  }
}
