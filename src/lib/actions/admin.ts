'use server'

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { contractors } from '@/lib/db/schema'

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
