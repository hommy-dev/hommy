'use server'

// Contractor supply-side settings: which roofing subtypes a company handles
// (contractor_services) and where it works (service_areas = center point +
// radius, the same geographic model lead matching uses). Owner/admin only.

import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser, getMembershipRole } from '@/lib/data/dashboard'
import { contractorServices, serviceAreas, services } from '@/lib/db/schema'

type Result<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

async function requireManager(): Promise<
  { ok: true; contractorId: string } | { ok: false; error: string }
> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) {
    return { ok: false, error: 'No company found for your account.' }
  }
  const role = await getMembershipRole(user.id, contractor.id)
  if (role !== 'owner' && role !== 'admin') {
    return { ok: false, error: 'Only owners and admins can change this.' }
  }
  return { ok: true, contractorId: contractor.id }
}

const SubtypesSchema = z.object({
  subtypes: z.array(z.string().trim().min(1)),
})

export async function updateServiceSubtypes(input: unknown): Promise<Result> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }

  const parsed = SubtypesSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid selection.' }

  const [roofing] = await db
    .select({ id: services.id, subtypes: services.subtypes })
    .from(services)
    .where(eq(services.slug, 'roofing'))
    .limit(1)
  if (!roofing) return { success: false, error: 'Roofing service is not set up.' }

  const allowed = new Set(roofing.subtypes)
  const subtypes = [...new Set(parsed.data.subtypes.filter((s) => allowed.has(s)))]
  if (subtypes.length === 0) {
    return { success: false, error: 'Pick at least one type of work.' }
  }

  await db
    .insert(contractorServices)
    .values({ contractorId: ctx.contractorId, serviceId: roofing.id, subtypes })
    .onConflictDoUpdate({
      target: [contractorServices.contractorId, contractorServices.serviceId],
      set: { subtypes },
    })

  return { success: true }
}

const AreaSchema = z.object({
  label: z.string().trim().min(1).max(160),
  lat: z.number(),
  lng: z.number(),
  radiusMiles: z.number().int().min(1).max(500),
})

export type ServiceAreaRow = {
  id: string
  label: string | null
  lat: number | null
  lng: number | null
  radiusMiles: number
}

export async function addServiceArea(
  input: unknown,
): Promise<Result<ServiceAreaRow>> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }

  const parsed = AreaSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Pick a valid area.' }
  const d = parsed.data

  const [row] = await db
    .insert(serviceAreas)
    .values({
      contractorId: ctx.contractorId,
      label: d.label,
      lat: d.lat,
      lng: d.lng,
      radiusMiles: d.radiusMiles,
    })
    .returning({
      id: serviceAreas.id,
      label: serviceAreas.label,
      lat: serviceAreas.lat,
      lng: serviceAreas.lng,
      radiusMiles: serviceAreas.radiusMiles,
    })

  return { success: true, data: row }
}

export async function removeServiceArea(id: string): Promise<Result> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }
  if (typeof id !== 'string' || !id) return { success: false, error: 'Invalid area.' }

  await db
    .delete(serviceAreas)
    .where(and(eq(serviceAreas.id, id), eq(serviceAreas.contractorId, ctx.contractorId)))

  return { success: true }
}
