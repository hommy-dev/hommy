'use server'

// Contractor supply-side settings: which roofing subtypes a company handles
// (contractor_services) and where it works (service_areas = center point +
// radius, the same geographic model lead matching uses). Owner/admin only.

import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser, getMembershipRole } from '@/lib/data/dashboard'
import { contractors, contractorServices, serviceAreas, services } from '@/lib/db/schema'
import { revalidateCityPages } from '@/lib/data/locations'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'

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

  // Changing which subtypes a company offers shifts subtype-page supply.
  revalidateCityPages()

  return { success: true }
}

// A coverage area is either a circle (centre + radius in km) or a drawn polygon
// (a ring of points). The DB trigger derives the matchable `geom` from whichever
// shape is stored — see migration 0006.
const CircleAreaSchema = z.object({
  type: z.literal('circle'),
  label: z.string().trim().min(1).max(160),
  lat: z.number(),
  lng: z.number(),
  radiusKm: z.number().positive().max(800),
})

const PolygonAreaSchema = z.object({
  type: z.literal('polygon'),
  label: z.string().trim().min(1).max(160),
  polygon: z
    .array(z.object({ lat: z.number(), lng: z.number() }))
    .min(3, 'A drawn area needs at least 3 points.')
    .max(500),
})

const AreaSchema = z.discriminatedUnion('type', [
  CircleAreaSchema,
  PolygonAreaSchema,
])

export type ServiceAreaRow = {
  id: string
  label: string | null
  areaType: 'circle' | 'polygon'
  lat: number | null
  lng: number | null
  radiusKm: number | null
  polygon: { lat: number; lng: number }[] | null
}

const RETURNING = {
  id: serviceAreas.id,
  label: serviceAreas.label,
  areaType: serviceAreas.areaType,
  lat: serviceAreas.lat,
  lng: serviceAreas.lng,
  radiusKm: serviceAreas.radiusKm,
  polygon: serviceAreas.polygon,
} as const

export async function addServiceArea(
  input: unknown,
): Promise<Result<ServiceAreaRow>> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }

  const parsed = AreaSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Pick a valid area.' }
  }
  const d = parsed.data

  const values =
    d.type === 'circle'
      ? {
          contractorId: ctx.contractorId,
          label: d.label,
          areaType: 'circle' as const,
          lat: d.lat,
          lng: d.lng,
          radiusKm: d.radiusKm,
        }
      : {
          contractorId: ctx.contractorId,
          label: d.label,
          areaType: 'polygon' as const,
          polygon: d.polygon,
        }

  const [row] = await db.insert(serviceAreas).values(values).returning(RETURNING)

  // New coverage may push a city across the indexability threshold — refresh SEO caches.
  revalidateCityPages()

  // If this (already verified) company just expanded coverage, it may now serve
  // awaiting-coverage leads — auto-match them. Off the request path; the geom is
  // trigger-populated after insert so the matching runs async in the Inngest fn.
  try {
    const [c] = await db
      .select({ status: contractors.verificationStatus })
      .from(contractors)
      .where(eq(contractors.id, ctx.contractorId))
      .limit(1)
    if (c?.status === 'verified') {
      await inngest.send({
        name: INNGEST_EVENTS.CONTRACTOR_ELIGIBLE,
        data: { contractorId: ctx.contractorId },
      })
    }
  } catch (err) {
    console.error('[addServiceArea] eligible emit failed (non-fatal)', err)
  }

  return {
    success: true,
    data: { ...row, areaType: row.areaType === 'polygon' ? 'polygon' : 'circle', polygon: row.polygon ?? null },
  }
}

export async function removeServiceArea(id: string): Promise<Result> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }
  if (typeof id !== 'string' || !id) return { success: false, error: 'Invalid area.' }

  await db
    .delete(serviceAreas)
    .where(and(eq(serviceAreas.id, id), eq(serviceAreas.contractorId, ctx.contractorId)))

  // Dropping coverage may take a city below the threshold — refresh SEO caches.
  revalidateCityPages()

  return { success: true }
}
