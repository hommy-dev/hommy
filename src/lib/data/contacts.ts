// Data layer for the contractor Contacts CRM. A `contact` is the company's
// long-term record of a homeowner (created on first engage); its jobs are the
// `projects` that point at it. Privileged connection; the caller authorizes
// (getRequiredUser('contractor')) and every query is scoped to the contractor.

import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contacts,
  conversations,
  homeowners,
  leads,
  projects,
  services,
  users,
} from '@/lib/db/schema'

export type ProjectStage = (typeof projects.stage.enumValues)[number]

export type ContactListItem = {
  id: string
  homeownerId: string
  name: string | null
  email: string | null
  phone: string | null
  tags: string[]
  jobCount: number
  /** Latest project activity, or the contact's creation time if no jobs. */
  lastActivityAt: Date
}

/** All of a company's contacts, most-recently-active first. */
export async function getContacts(contractorId: string): Promise<ContactListItem[]> {
  const rows = await db
    .select({
      id: contacts.id,
      homeownerId: contacts.homeownerId,
      name: users.fullName,
      email: users.email,
      phone: users.phone,
      tags: contacts.tags,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .innerJoin(homeowners, eq(homeowners.id, contacts.homeownerId))
    .innerJoin(users, eq(users.id, homeowners.userId))
    .where(eq(contacts.contractorId, contractorId))

  // Aggregate job count + last activity per contact in one pass.
  const projRows = await db
    .select({ contactId: projects.contactId, stageUpdatedAt: projects.stageUpdatedAt })
    .from(projects)
    .where(eq(projects.contractorId, contractorId))

  const byContact = new Map<string, { count: number; last: Date }>()
  for (const p of projRows) {
    const cur = byContact.get(p.contactId)
    if (!cur) byContact.set(p.contactId, { count: 1, last: p.stageUpdatedAt })
    else {
      cur.count += 1
      if (p.stageUpdatedAt > cur.last) cur.last = p.stageUpdatedAt
    }
  }

  return rows
    .map((r) => {
      const agg = byContact.get(r.id)
      return {
        id: r.id,
        homeownerId: r.homeownerId,
        name: r.name,
        email: r.email,
        phone: r.phone,
        tags: r.tags,
        jobCount: agg?.count ?? 0,
        lastActivityAt: agg?.last ?? r.createdAt,
      }
    })
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
}

export type ContactJob = {
  projectId: string
  leadId: string | null
  title: string
  stage: ProjectStage
  estimateValue: string | null
  city: string | null
  state: string | null
  createdAt: Date
  conversationId: string | null
}

export type ContactDetail = {
  id: string
  homeownerId: string
  name: string | null
  email: string | null
  phone: string | null
  tags: string[]
  notes: string | null
  createdAt: Date
  jobs: ContactJob[]
}

/** One contact's full record (info + tags/notes + jobs), scoped to the company. */
export async function getContactDetail(
  contractorId: string,
  contactId: string,
): Promise<ContactDetail | null> {
  const [c] = await db
    .select({
      id: contacts.id,
      homeownerId: contacts.homeownerId,
      name: users.fullName,
      email: users.email,
      phone: users.phone,
      tags: contacts.tags,
      notes: contacts.notes,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .innerJoin(homeowners, eq(homeowners.id, contacts.homeownerId))
    .innerJoin(users, eq(users.id, homeowners.userId))
    .where(and(eq(contacts.id, contactId), eq(contacts.contractorId, contractorId)))
    .limit(1)
  if (!c) return null

  const jobRows = await db
    .select({
      projectId: projects.id,
      leadId: projects.leadId,
      stage: projects.stage,
      estimateValue: projects.estimateValue,
      createdAt: projects.createdAt,
      serviceName: services.name,
      serviceDetails: leads.serviceDetails,
      city: leads.city,
      state: leads.state,
      conversationId: conversations.id,
    })
    .from(projects)
    .innerJoin(services, eq(services.id, projects.serviceId))
    .leftJoin(leads, eq(leads.id, projects.leadId))
    .leftJoin(
      conversations,
      and(eq(conversations.contextType, 'project'), eq(conversations.contextId, projects.id)),
    )
    .where(and(eq(projects.contactId, contactId), eq(projects.contractorId, contractorId)))
    .orderBy(desc(projects.createdAt))

  const jobs: ContactJob[] = jobRows.map((j) => {
    const subtypes = (j.serviceDetails as { subtypes?: string[] } | null)?.subtypes
    return {
      projectId: j.projectId,
      leadId: j.leadId,
      title: subtypes?.[0] ?? j.serviceName,
      stage: j.stage,
      estimateValue: j.estimateValue,
      city: j.city,
      state: j.state,
      createdAt: j.createdAt,
      conversationId: j.conversationId,
    }
  })

  return { ...c, jobs }
}
