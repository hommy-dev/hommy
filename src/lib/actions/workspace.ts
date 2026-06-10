'use server'

// Switch which company a multi-company contractor is operating as. Persists to
// users.active_contractor_id (survives devices). Validated against an active
// membership so a stale/forged id can't switch you into a company you left.

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { contractorMembers, users } from '@/lib/db/schema'

type Result = { success: true } | { success: false; error: string }

export async function switchWorkspace(contractorId: string): Promise<Result> {
  const user = await getRequiredUser('contractor')
  if (typeof contractorId !== 'string' || !contractorId) {
    return { success: false, error: 'Invalid workspace.' }
  }

  const [membership] = await db
    .select({ id: contractorMembers.id })
    .from(contractorMembers)
    .where(
      and(
        eq(contractorMembers.userId, user.id),
        eq(contractorMembers.contractorId, contractorId),
        eq(contractorMembers.status, 'active'),
      ),
    )
    .limit(1)
  if (!membership) {
    return { success: false, error: 'You’re not a member of that company.' }
  }

  await db
    .update(users)
    .set({ activeContractorId: contractorId })
    .where(eq(users.id, user.id))

  // The active company drives the entire contractor tree (leads, billing, …).
  revalidatePath('/contractor', 'layout')
  return { success: true }
}
