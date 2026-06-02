'use server'

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser } from '@/lib/data/dashboard'
import {
  users,
  contractors,
  contractorServices,
  serviceAreas,
  services,
} from '@/lib/db/schema'

type ActionResult = { success: true } | { success: false; error: string }

const OnboardingSchema = z.object({
  companyName: z.string().trim().min(2, 'Enter your company name'),
  phone: z.string().trim().max(30).optional().default(''),
  yearsInBusiness: z.number().int().min(0).max(100).nullable().optional(),
  subtypes: z.array(z.string().trim().min(1)).min(1, 'Pick at least one type of work'),
  zips: z.array(z.string().regex(/^\d{5}$/)).min(1, 'Add at least one ZIP code'),
})

/**
 * Saves the contractor onboarding wizard: company details, the roofing subtypes
 * they handle (contractor_services), and the ZIP codes they cover (service_areas).
 * ZIP centroids (lat/lng) are geocoded later; storm matching needs them, plain
 * ZIP matching does not.
 */
export async function completeOnboarding(input: unknown): Promise<ActionResult> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return { success: false, error: 'No company found for your account.' }

  const parsed = OnboardingSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Check your entries.' }
  }
  const d = parsed.data

  const [roofing] = await db
    .select({ id: services.id, subtypes: services.subtypes })
    .from(services)
    .where(eq(services.slug, 'roofing'))
    .limit(1)
  if (!roofing) return { success: false, error: 'Roofing service is not set up.' }

  // Keep only subtypes the service actually defines, and de-dupe ZIPs.
  const allowed = new Set(roofing.subtypes)
  const subtypes = d.subtypes.filter((s) => allowed.has(s))
  if (subtypes.length === 0) return { success: false, error: 'Pick at least one type of work.' }
  const zips = Array.from(new Set(d.zips))

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(contractors)
        .set({ companyName: d.companyName, yearsInBusiness: d.yearsInBusiness ?? null })
        .where(eq(contractors.id, contractor.id))

      if (d.phone) {
        await tx.update(users).set({ phone: d.phone }).where(eq(users.id, user.id))
      }

      await tx
        .insert(contractorServices)
        .values({ contractorId: contractor.id, serviceId: roofing.id, subtypes })
        .onConflictDoUpdate({
          target: [contractorServices.contractorId, contractorServices.serviceId],
          set: { subtypes },
        })

      // Replace the company's service areas with the new set.
      await tx.delete(serviceAreas).where(eq(serviceAreas.contractorId, contractor.id))
      await tx.insert(serviceAreas).values(
        zips.map((zipCode) => ({ contractorId: contractor.id, zipCode })),
      )
    })
  } catch (err) {
    console.error('[completeOnboarding] failed', err)
    return { success: false, error: 'Could not save your details. Please try again.' }
  }

  return { success: true }
}
