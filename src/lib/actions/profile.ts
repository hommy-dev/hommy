'use server'

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser } from '@/lib/data/dashboard'
import { contractors } from '@/lib/db/schema'

type Result = { success: true } | { success: false; error: string }

const ProfileSchema = z.object({
  companyName: z.string().trim().min(2, 'Enter your company name'),
  bio: z.string().trim().max(600).optional().default(''),
  logoUrl: z.string().url().nullable().optional(),
})

export async function updateBusinessProfile(input: unknown): Promise<Result> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return { success: false, error: 'No company found for your account.' }

  const parsed = ProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Check your entries.' }
  }
  const d = parsed.data

  await db
    .update(contractors)
    .set({ companyName: d.companyName, bio: d.bio || null, logoUrl: d.logoUrl ?? null })
    .where(eq(contractors.id, contractor.id))

  return { success: true }
}

const VerificationSchema = z.object({
  licenseNumber: z.string().trim().min(2, 'Enter your license number'),
  insuranceProvider: z.string().trim().min(2, 'Enter your insurance provider'),
  insurancePolicy: z.string().trim().min(2, 'Enter your policy number'),
  licenseDocUrl: z.string().url('Upload your license document'),
  insuranceDocUrl: z.string().url('Upload your insurance certificate'),
})

/**
 * Submits (or re-submits) the contractor for verification. Sets status to
 * `pending` so an admin reviews it. Engaging leads stays gated until an admin
 * approves and flips the status to `verified`.
 */
export async function submitVerification(input: unknown): Promise<Result> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return { success: false, error: 'No company found for your account.' }

  const parsed = VerificationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Please complete every field.' }
  }
  const d = parsed.data

  await db
    .update(contractors)
    .set({
      licenseNumber: d.licenseNumber,
      insuranceProvider: d.insuranceProvider,
      insurancePolicy: d.insurancePolicy,
      licenseDocUrl: d.licenseDocUrl,
      insuranceDocUrl: d.insuranceDocUrl,
      verificationStatus: 'pending',
    })
    .where(eq(contractors.id, contractor.id))

  return { success: true }
}
