// Data layer for the contractor's projects (the CRM workspace created at
// engage). NOT cached — stage + quotes change constantly. Authorization is
// scoping every query to the caller's contractorId.

import { db } from '@/lib/db'
import { and, desc, eq, inArray } from 'drizzle-orm'
import {
  contacts,
  estimates,
  homeowners,
  leads,
  projects,
  services,
  users,
} from '@/lib/db/schema'
import { subtypeLabel, subtypeList } from '@/lib/leads/subtype'
import { getProjectConversationId } from '@/lib/messaging/system'

export type ProjectStage = (typeof projects.stage.enumValues)[number]
export type EstimateStatus = (typeof estimates.status.enumValues)[number]

export type ProjectListItem = {
  id: string
  stage: ProjectStage
  homeownerName: string | null
  serviceName: string
  subtype: string | null
  city: string | null
  state: string | null
  latestQuoteTotal: string | null
  latestQuoteStatus: EstimateStatus | null
  stageUpdatedAt: Date
}

/** The company's projects, newest activity first. */
export async function getContractorProjects(contractorId: string): Promise<ProjectListItem[]> {
  const rows = await db
    .select({
      id: projects.id,
      stage: projects.stage,
      stageUpdatedAt: projects.stageUpdatedAt,
      homeownerName: users.fullName,
      serviceName: services.name,
      serviceDetails: leads.serviceDetails,
      city: leads.city,
      state: leads.state,
    })
    .from(projects)
    .innerJoin(contacts, eq(contacts.id, projects.contactId))
    .innerJoin(homeowners, eq(homeowners.id, contacts.homeownerId))
    .innerJoin(users, eq(users.id, homeowners.userId))
    .innerJoin(services, eq(services.id, projects.serviceId))
    .leftJoin(leads, eq(leads.id, projects.leadId))
    .where(eq(projects.contractorId, contractorId))
    .orderBy(desc(projects.stageUpdatedAt))

  if (rows.length === 0) return []

  // Latest quote per project (one indexed pass).
  const latest = await db
    .selectDistinctOn([estimates.projectId], {
      projectId: estimates.projectId,
      total: estimates.total,
      status: estimates.status,
    })
    .from(estimates)
    .where(inArray(estimates.projectId, rows.map((r) => r.id)))
    .orderBy(estimates.projectId, desc(estimates.createdAt))
  const latestByProject = new Map(latest.map((l) => [l.projectId, l]))

  return rows.map((r) => ({
    id: r.id,
    stage: r.stage,
    homeownerName: r.homeownerName,
    serviceName: r.serviceName,
    subtype: subtypeLabel(r.serviceDetails ?? {}),
    city: r.city,
    state: r.state,
    latestQuoteTotal: latestByProject.get(r.id)?.total ?? null,
    latestQuoteStatus: latestByProject.get(r.id)?.status ?? null,
    stageUpdatedAt: r.stageUpdatedAt,
  }))
}

export type EstimateSummary = {
  id: string
  status: EstimateStatus
  subtotal: string | null
  taxAmount: string | null
  total: string | null
  lineItems: Array<{ label: string; amount: string }>
  scopeNotes: string | null
  validUntil: Date | null
  sentAt: Date | null
  createdAt: Date
}

export type ProjectDetail = {
  id: string
  stage: ProjectStage
  conversationId: string | null
  homeowner: { name: string | null; phone: string | null; email: string }
  lead: {
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    urgency: (typeof leads.urgency.enumValues)[number] | null
    subtypes: string[]
    notes: string | null
    photoUrl: string | null
  } | null
  estimates: EstimateSummary[]
  createdAt: Date
}

/** A single project's full workspace for the owning company (or null). */
export async function getProjectForContractor(
  projectId: string,
  contractorId: string,
): Promise<ProjectDetail | null> {
  const [project] = await db
    .select({
      id: projects.id,
      contractorId: projects.contractorId,
      stage: projects.stage,
      leadId: projects.leadId,
      createdAt: projects.createdAt,
      homeownerName: users.fullName,
      homeownerPhone: users.phone,
      homeownerEmail: users.email,
    })
    .from(projects)
    .innerJoin(contacts, eq(contacts.id, projects.contactId))
    .innerJoin(homeowners, eq(homeowners.id, contacts.homeownerId))
    .innerJoin(users, eq(users.id, homeowners.userId))
    .where(and(eq(projects.id, projectId), eq(projects.contractorId, contractorId)))
    .limit(1)
  if (!project) return null

  const [leadRow, estimateRows, conversationId] = await Promise.all([
    project.leadId
      ? db
          .select({
            address: leads.address,
            city: leads.city,
            state: leads.state,
            zipCode: leads.zipCode,
            urgency: leads.urgency,
            serviceDetails: leads.serviceDetails,
            notes: leads.notes,
            photoUrl: leads.photoUrl,
          })
          .from(leads)
          .where(eq(leads.id, project.leadId))
          .limit(1)
      : Promise.resolve([]),
    db
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
        createdAt: estimates.createdAt,
      })
      .from(estimates)
      .where(eq(estimates.projectId, projectId))
      .orderBy(desc(estimates.createdAt)),
    getProjectConversationId(projectId),
  ])

  const lead = leadRow[0]
    ? {
        address: leadRow[0].address,
        city: leadRow[0].city,
        state: leadRow[0].state,
        zipCode: leadRow[0].zipCode,
        urgency: leadRow[0].urgency,
        subtypes: subtypeList(leadRow[0].serviceDetails ?? {}),
        notes: leadRow[0].notes,
        photoUrl: leadRow[0].photoUrl,
      }
    : null

  return {
    id: project.id,
    stage: project.stage,
    conversationId,
    homeowner: {
      name: project.homeownerName,
      phone: project.homeownerPhone,
      email: project.homeownerEmail,
    },
    lead,
    estimates: estimateRows,
    createdAt: project.createdAt,
  }
}
