// Public read for the tokenized quote-acceptance page. No session — the page is
// reached via an emailed link; the token is the capability. Returns just enough
// to render the quote summary and decide which state to show.

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors, estimates, leads, projects, services } from '@/lib/db/schema'
import { subtypeLabel } from '@/lib/leads/subtype'
import type { EstimateStatus, LeadStatus } from '@/lib/data/homeowner'

export type AcceptView = {
  estimateId: string
  status: EstimateStatus
  contractorName: string | null
  serviceName: string
  subtype: string | null
  total: string | null
  lineItems: Array<{ label: string; amount: string }>
  scopeNotes: string | null
  validUntil: Date | null
  leadStatus: LeadStatus
}

export async function getAcceptView(token: string): Promise<AcceptView | null> {
  if (!token || token.length < 16) return null
  const [row] = await db
    .select({
      estimateId: estimates.id,
      status: estimates.status,
      total: estimates.total,
      lineItems: estimates.lineItems,
      scopeNotes: estimates.scopeNotes,
      validUntil: estimates.validUntil,
      contractorName: contractors.companyName,
      serviceName: services.name,
      serviceDetails: leads.serviceDetails,
      leadStatus: leads.status,
    })
    .from(estimates)
    .innerJoin(projects, eq(projects.id, estimates.projectId))
    .innerJoin(contractors, eq(contractors.id, projects.contractorId))
    .innerJoin(leads, eq(leads.id, projects.leadId))
    .innerJoin(services, eq(services.id, leads.serviceId))
    .where(eq(estimates.acceptToken, token))
    .limit(1)
  if (!row) return null

  return {
    estimateId: row.estimateId,
    status: row.status,
    contractorName: row.contractorName,
    serviceName: row.serviceName,
    subtype: subtypeLabel(row.serviceDetails ?? {}),
    total: row.total,
    lineItems: row.lineItems,
    scopeNotes: row.scopeNotes,
    validUntil: row.validUntil,
    leadStatus: row.leadStatus,
  }
}
