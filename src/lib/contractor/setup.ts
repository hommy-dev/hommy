import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorServices, serviceAreas, services } from '@/lib/db/schema'
import { getVerificationState } from './verification'
import type { Contractor } from '@/lib/data/dashboard'

export type Area = { label: string; lat: number; lng: number; radiusKm: number }

// Everything the ContractorSetupForm needs to render, in one shape, so the
// onboarding page and the dashboard gate hydrate it the same way.
export type SetupInitial = {
  companyName: string
  phone: string
  yearsInBusiness: number | null
  bio: string
  logoUrl: string | null
  subtypes: string[]
  areas: Area[]
  licenseDocUrl: string | null
  insuranceDocUrl: string | null
}

// The single source of truth for "where is this contractor in setup", read by
// the onboarding page, the dashboard gate, the sidebar card, and the reminder
// job so they never drift apart.
//   needs_info     → missing the basics that make them matchable (name/services/areas)
//   needs_docs     → matchable, but verification not started (skippable; nudge them)
//   pending_review → docs submitted, awaiting an admin
//   rejected       → verification rejected, resubmit
//   verified       → fully set up
export type ContractorSetupState =
  | 'needs_info'
  | 'needs_docs'
  | 'pending_review'
  | 'rejected'
  | 'verified'

type SetupInput = Pick<
  Contractor,
  'id' | 'companyName' | 'verificationStatus' | 'licenseDocUrl' | 'insuranceDocUrl'
>

/** True when the company has the basics needed to receive leads. */
export async function hasContractorInfo(
  contractor: Pick<Contractor, 'id' | 'companyName'>,
): Promise<boolean> {
  if ((contractor.companyName ?? '').trim().length < 2) return false
  const [svc] = await db
    .select({ n: sql<number>`count(*)` })
    .from(contractorServices)
    .where(eq(contractorServices.contractorId, contractor.id))
  if (Number(svc?.n ?? 0) === 0) return false
  const [area] = await db
    .select({ n: sql<number>`count(*)` })
    .from(serviceAreas)
    .where(eq(serviceAreas.contractorId, contractor.id))
  return Number(area?.n ?? 0) > 0
}

export async function getContractorSetupState(
  contractor: SetupInput,
): Promise<ContractorSetupState> {
  const v = getVerificationState(contractor)
  if (v === 'verified') return 'verified'
  if (v === 'rejected') return 'rejected'
  if (v === 'in_review') return 'pending_review'
  // not_started → matchable or not?
  return (await hasContractorInfo(contractor)) ? 'needs_docs' : 'needs_info'
}

/** Hydrates the full setup form state for a contractor (services, areas, profile, docs). */
export async function getContractorSetupData(
  contractor: Pick<
    Contractor,
    | 'id'
    | 'companyName'
    | 'yearsInBusiness'
    | 'bio'
    | 'logoUrl'
    | 'licenseDocUrl'
    | 'insuranceDocUrl'
  >,
  userPhone: string | null,
): Promise<{ availableSubtypes: string[]; initial: SetupInitial }> {
  const [roofing] = await db
    .select({ id: services.id, subtypes: services.subtypes })
    .from(services)
    .where(eq(services.slug, 'roofing'))
    .limit(1)

  let subtypes: string[] = []
  if (roofing) {
    const [row] = await db
      .select({ subtypes: contractorServices.subtypes })
      .from(contractorServices)
      .where(
        and(
          eq(contractorServices.contractorId, contractor.id),
          eq(contractorServices.serviceId, roofing.id),
        ),
      )
      .limit(1)
    subtypes = row?.subtypes ?? []
  }

  const areaRows = await db
    .select({
      label: serviceAreas.label,
      lat: serviceAreas.lat,
      lng: serviceAreas.lng,
      radiusKm: serviceAreas.radiusKm,
    })
    .from(serviceAreas)
    .where(eq(serviceAreas.contractorId, contractor.id))

  const areas: Area[] = areaRows
    .filter((a) => a.lat != null && a.lng != null)
    .map((a) => ({
      label: a.label ?? 'Coverage area',
      lat: a.lat as number,
      lng: a.lng as number,
      radiusKm: a.radiusKm ?? 40,
    }))

  return {
    availableSubtypes: roofing?.subtypes ?? [],
    initial: {
      companyName: contractor.companyName ?? '',
      phone: userPhone ?? '',
      yearsInBusiness: contractor.yearsInBusiness ?? null,
      bio: contractor.bio ?? '',
      logoUrl: contractor.logoUrl,
      subtypes,
      areas,
      licenseDocUrl: contractor.licenseDocUrl,
      insuranceDocUrl: contractor.insuranceDocUrl,
    },
  }
}
