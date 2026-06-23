'use server'

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser } from '@/lib/data/dashboard'
import { assignContractorSlugIfMissing } from '@/lib/contractor/slug'
import { revalidateCityPages } from '@/lib/data/locations'
import { revalidateRoofers } from '@/lib/data/roofers'
import { normalizeToE164 } from '@/lib/phone/e164'
import { contractors, users } from '@/lib/db/schema'

type Result = { success: true } | { success: false; error: string }

const ProfileSchema = z.object({
  companyName: z.string().trim().min(2, 'Enter your company name'),
  // Optional with NO default — when omitted the phone is left untouched.
  phone: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(600).optional().default(''),
  logoUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  yearsInBusiness: z.coerce.number().int().min(0).max(200).nullable().optional(),
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

  await db.transaction(async (tx) => {
    await tx
      .update(contractors)
      .set({
        companyName: d.companyName,
        bio: d.bio || null,
        logoUrl: d.logoUrl ?? null,
        bannerUrl: d.bannerUrl ?? null,
        ...(d.yearsInBusiness !== undefined
          ? { yearsInBusiness: d.yearsInBusiness }
          : {}),
      })
      .where(eq(contractors.id, contractor.id))

    // Mint the stable /roofers/[slug] URL the first time a company is named.
    await assignContractorSlugIfMissing(tx, contractor.id, d.companyName)

    if (d.phone !== undefined) {
      await tx
        .update(users)
        .set({ phone: d.phone ? (normalizeToE164(d.phone) ?? d.phone) : null })
        .where(eq(users.id, user.id))
    }
  })

  // Name / logo / bio changes surface on the public profile + city pro cards.
  revalidateRoofers()
  revalidateCityPages()

  return { success: true }
}

/** Lightweight logo update (used by the setup modal). */
export async function setCompanyLogo(logoUrl: string | null): Promise<Result> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return { success: false, error: 'No company found for your account.' }
  if (logoUrl !== null && !/^https?:\/\//.test(logoUrl)) {
    return { success: false, error: 'Invalid logo.' }
  }
  await db.update(contractors).set({ logoUrl }).where(eq(contractors.id, contractor.id))
  return { success: true }
}

const VerificationSchema = z.object({
  licenseDocUrl: z.string().url('Upload your license document'),
  insuranceDocUrl: z.string().url('Upload your insurance certificate'),
})

/**
 * Submits (or re-submits) the contractor for verification. We collect only the
 * two documents (license + insurance); an admin reviews them. Sets status to
 * `pending`. Engaging leads stays gated until an admin flips it to `verified`.
 */
export async function submitVerification(input: unknown): Promise<Result> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return { success: false, error: 'No company found for your account.' }

  const parsed = VerificationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Upload both documents.' }
  }
  const d = parsed.data

  await db
    .update(contractors)
    .set({
      licenseDocUrl: d.licenseDocUrl,
      insuranceDocUrl: d.insuranceDocUrl,
      verificationStatus: 'pending',
    })
    .where(eq(contractors.id, contractor.id))

  return { success: true }
}
