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
  subtotal: string | null
  taxRate: string | null
  taxAmount: string | null
  total: string | null
  lineItems: Array<{ label: string; amount: string }>
  scopeNotes: string | null
  warranty: string | null
  issuedAt: Date | null
  validUntil: Date | null
  leadStatus: LeadStatus
  company: {
    logoUrl: string | null
    licenseNumber: string | null
    insuranceProvider: string | null
    yearsInBusiness: number | null
    verified: boolean
    avgRating: string | null
    totalReviews: number
  }
}

export async function getAcceptView(token: string): Promise<AcceptView | null> {
  if (!token || token.length < 16) return null
  const [row] = await db
    .select({
      estimateId: estimates.id,
      status: estimates.status,
      subtotal: estimates.subtotal,
      taxRate: estimates.taxRate,
      taxAmount: estimates.taxAmount,
      total: estimates.total,
      lineItems: estimates.lineItems,
      scopeNotes: estimates.scopeNotes,
      warranty: estimates.warranty,
      sentAt: estimates.sentAt,
      createdAt: estimates.createdAt,
      validUntil: estimates.validUntil,
      contractorName: contractors.companyName,
      logoUrl: contractors.logoUrl,
      licenseNumber: contractors.licenseNumber,
      insuranceProvider: contractors.insuranceProvider,
      yearsInBusiness: contractors.yearsInBusiness,
      verificationStatus: contractors.verificationStatus,
      avgRating: contractors.avgRating,
      totalReviews: contractors.totalReviews,
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
    subtotal: row.subtotal,
    taxRate: row.taxRate,
    taxAmount: row.taxAmount,
    total: row.total,
    lineItems: row.lineItems,
    scopeNotes: row.scopeNotes,
    warranty: row.warranty,
    issuedAt: row.sentAt ?? row.createdAt,
    validUntil: row.validUntil,
    leadStatus: row.leadStatus,
    company: {
      logoUrl: row.logoUrl,
      licenseNumber: row.licenseNumber,
      insuranceProvider: row.insuranceProvider,
      yearsInBusiness: row.yearsInBusiness,
      verified: row.verificationStatus === 'verified',
      avgRating: row.avgRating,
      totalReviews: row.totalReviews,
    },
  }
}
