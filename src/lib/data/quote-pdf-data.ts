// Loads everything needed to render a quote document/PDF for ONE estimate, with
// NO session check — authorization is the caller's job (the API route checks a
// session participant or a matching accept token; the Inngest job is trusted).
// Returns the presentational QuoteDocumentData plus the projectId + acceptToken
// the route needs to authorize.

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors, estimates, leads, projects, services } from '@/lib/db/schema'
import { subtypeLabel } from '@/lib/leads/subtype'
import type { QuoteDocumentData } from '@/components/quote/quote-document'

export type QuoteForPdf = {
  data: QuoteDocumentData
  projectId: string
  acceptToken: string | null
}

export async function loadQuoteForPdf(estimateId: string): Promise<QuoteForPdf | null> {
  const [row] = await db
    .select({
      id: estimates.id,
      projectId: estimates.projectId,
      acceptToken: estimates.acceptToken,
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
    })
    .from(estimates)
    .innerJoin(projects, eq(projects.id, estimates.projectId))
    .innerJoin(contractors, eq(contractors.id, projects.contractorId))
    .innerJoin(leads, eq(leads.id, projects.leadId))
    .innerJoin(services, eq(services.id, leads.serviceId))
    .where(eq(estimates.id, estimateId))
    .limit(1)
  if (!row) return null

  return {
    projectId: row.projectId,
    acceptToken: row.acceptToken,
    data: {
      estimateId: row.id,
      status: row.status,
      company: {
        name: row.contractorName,
        logoUrl: row.logoUrl,
        licenseNumber: row.licenseNumber,
        insuranceProvider: row.insuranceProvider,
        yearsInBusiness: row.yearsInBusiness,
        verified: row.verificationStatus === 'verified',
        avgRating: row.avgRating,
        totalReviews: row.totalReviews,
      },
      serviceName: row.serviceName,
      subtype: subtypeLabel(row.serviceDetails ?? {}),
      clientName: null,
      issuedAt: (row.sentAt ?? row.createdAt)?.toISOString() ?? null,
      validUntil: row.validUntil ? row.validUntil.toISOString() : null,
      lineItems: row.lineItems,
      subtotal: row.subtotal,
      taxRate: row.taxRate,
      taxAmount: row.taxAmount,
      total: row.total,
      scopeNotes: row.scopeNotes,
      warranty: row.warranty,
    },
  }
}
