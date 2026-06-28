// Prospect → contractor conversion helpers. When a recruited prospect clicks
// their claim link and signs up, we link the new company back to the prospect for
// attribution (and so we stop emailing them).

import { and, eq, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorProspects } from '@/lib/db/schema'

export type ClaimProspect = {
  id: string
  companyName: string | null
  website: string | null
  phone: string | null
  city: string | null
  state: string | null
  alreadyConverted: boolean
}

/** Load the bits the /claim link needs to pre-fill signup. */
export async function getProspectForClaim(prospectId: string): Promise<ClaimProspect | null> {
  const [p] = await db
    .select({
      id: contractorProspects.id,
      companyName: contractorProspects.companyName,
      website: contractorProspects.website,
      phone: contractorProspects.phone,
      city: contractorProspects.city,
      state: contractorProspects.state,
      convertedToContractorId: contractorProspects.convertedToContractorId,
    })
    .from(contractorProspects)
    .where(eq(contractorProspects.id, prospectId))
    .limit(1)
  if (!p) return null
  return { ...p, alreadyConverted: p.convertedToContractorId != null }
}

/** Mark that a prospect opened their claim link (unless already converted). */
export async function markProspectClicked(prospectId: string): Promise<void> {
  await db
    .update(contractorProspects)
    .set({ outreachStatus: 'clicked', updatedAt: new Date() })
    .where(and(eq(contractorProspects.id, prospectId), ne(contractorProspects.outreachStatus, 'converted')))
}

/** Link a prospect to the company it became (idempotent, best-effort). */
export async function linkProspectConversion(prospectId: string, contractorId: string): Promise<void> {
  await db
    .update(contractorProspects)
    .set({
      convertedToContractorId: contractorId,
      convertedAt: new Date(),
      outreachStatus: 'converted',
      updatedAt: new Date(),
    })
    .where(eq(contractorProspects.id, prospectId))
}
