'use server'

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { contractors, purchaseIntents } from '@/lib/db/schema'
import { grantCredits } from '@/lib/credits/ledger'
import { broadcastCreditsChanged } from '@/lib/credits/notify'

type Result = { success: true } | { success: false; error: string }

const DecisionSchema = z.object({
  contractorId: z.string().uuid('Invalid company'),
  decision: z.enum(['verified', 'rejected']),
})

/**
 * Admin verification decision: flips a company's verificationStatus to
 * `verified` or `rejected`. Verified companies may engage leads (canEngageLeads).
 * Admin-only — enforced by getRequiredUser('admin').
 */
export async function decideVerification(input: unknown): Promise<Result> {
  await getRequiredUser('admin')

  const parsed = DecisionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  }
  const { contractorId, decision } = parsed.data

  await db
    .update(contractors)
    .set({ verificationStatus: decision })
    .where(eq(contractors.id, contractorId))

  revalidatePath('/admin/verification')
  revalidatePath('/admin')
  return { success: true }
}

const GrantSchema = z.object({
  contractorId: z.string().uuid('Invalid company'),
  credits: z.number().int().positive('Enter a positive amount').max(100_000),
  kind: z.enum(['purchase', 'adjustment', 'promo', 'refund']).default('adjustment'),
  /** When set, the matching purchase intent is marked fulfilled. */
  intentId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
})

/**
 * Admin manually grants credits to a company — the v1 settlement path for
 * offline payments (a contractor pays out-of-band; admin grants here). When an
 * `intentId` is passed, the purchase request is marked fulfilled. Admin-only.
 */
export async function grantCreditsToContractor(input: unknown): Promise<Result> {
  const admin = await getRequiredUser('admin')

  const parsed = GrantSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  }
  const { contractorId, credits, kind, intentId, note } = parsed.data

  let newBalance = 0
  try {
    await db.transaction(async (tx) => {
      newBalance = await grantCredits(tx, {
        contractorId,
        kind,
        amount: credits,
        sourceType: intentId ? 'purchase_intent' : 'admin_grant',
        sourceId: intentId ?? undefined,
        createdBy: admin.id,
      })
      if (intentId) {
        await tx
          .update(purchaseIntents)
          .set({ status: 'fulfilled', note: note ?? null })
          .where(eq(purchaseIntents.id, intentId))
      }
    })
  } catch (err) {
    console.error('[grantCreditsToContractor] failed', err)
    return { success: false, error: 'Could not grant credits. Please try again.' }
  }

  // Refresh the company's credit chip live.
  void broadcastCreditsChanged(contractorId, newBalance)

  revalidatePath('/admin/credits')
  revalidatePath('/admin')
  return { success: true }
}

/** Mark a purchase request declined (dismiss without granting). Admin-only. */
export async function declinePurchaseIntent(intentId: string): Promise<Result> {
  await getRequiredUser('admin')
  if (!z.string().uuid().safeParse(intentId).success) {
    return { success: false, error: 'Invalid request.' }
  }
  await db
    .update(purchaseIntents)
    .set({ status: 'declined' })
    .where(eq(purchaseIntents.id, intentId))
  revalidatePath('/admin/credits')
  return { success: true }
}
