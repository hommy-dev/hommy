// Prospect → contractor conversion helpers. When a recruited prospect clicks
// their claim link and signs up, we link the new company back to the prospect for
// attribution (and so we stop emailing them).

import { and, eq, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorProspects } from '@/lib/db/schema'
import { domainFromUrl } from '@/lib/integrations/osm-places-server'

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

// ── Prefill: tie a brand-new signup back to a scraped prospect ────────────────

/** The prospect fields we use to prefill onboarding + auto-connect Google. */
export type PrefillProspect = {
  id: string
  companyName: string | null
  phone: string | null
  city: string | null
  state: string | null
  lat: number | null
  lng: number | null
  sourceRef: string | null // Google place_id
}

const PREFILL_COLUMNS = {
  id: contractorProspects.id,
  companyName: contractorProspects.companyName,
  phone: contractorProspects.phone,
  city: contractorProspects.city,
  state: contractorProspects.state,
  lat: contractorProspects.lat,
  lng: contractorProspects.lng,
  sourceRef: contractorProspects.sourceRef,
}

// Free / consumer mailbox providers — a domain match against these means nothing
// (everyone shares them), so they never link a self-signup to a prospect.
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'outlook.com',
  'hotmail.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com',
  'proton.me', 'protonmail.com', 'gmx.com', 'mail.com', 'zoho.com', 'yandex.com',
])

/**
 * Find the scraped prospect a new contractor signup belongs to, so we can prefill
 * their profile and auto-connect their Google listing. Resolve order (most → least
 * certain), skipping any already-converted prospect:
 *   1. the recruit claim-link cookie (an exact prospect id),
 *   2. an exact business-email match,
 *   3. a unique business-domain match (free mailbox domains excluded).
 * Returns null when nothing confident matches (→ normal blank onboarding).
 */
export async function resolveProspectForSignup(args: {
  cookieProspectId?: string | null
  email?: string | null
}): Promise<PrefillProspect | null> {
  // 1. Cookie — strongest signal.
  if (args.cookieProspectId) {
    const [p] = await db
      .select(PREFILL_COLUMNS)
      .from(contractorProspects)
      .where(
        and(
          eq(contractorProspects.id, args.cookieProspectId),
          isNull(contractorProspects.convertedToContractorId),
        ),
      )
      .limit(1)
    if (p) return p
  }

  const email = args.email?.trim().toLowerCase()
  if (!email || !email.includes('@')) return null

  // 2. Exact email match.
  const [byEmail] = await db
    .select(PREFILL_COLUMNS)
    .from(contractorProspects)
    .where(
      and(
        eq(contractorProspects.email, email),
        isNull(contractorProspects.convertedToContractorId),
      ),
    )
    .limit(1)
  if (byEmail) return byEmail

  // 3. Unique business-domain match.
  const rawDomain = email.split('@')[1] ?? ''
  if (FREE_EMAIL_DOMAINS.has(rawDomain)) return null
  const domain = domainFromUrl(`https://${rawDomain}`)
  if (!domain || FREE_EMAIL_DOMAINS.has(domain)) return null

  const byDomain = await db
    .select(PREFILL_COLUMNS)
    .from(contractorProspects)
    .where(
      and(
        eq(contractorProspects.domain, domain),
        isNull(contractorProspects.convertedToContractorId),
      ),
    )
    .limit(2) // only link if exactly one — ambiguity means we can't be sure.
  return byDomain.length === 1 ? byDomain[0] : null
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
