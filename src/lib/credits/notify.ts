// Realtime + comms helpers for credit changes. Call AFTER the DB commit (the
// ledger write is the source of truth; the broadcast just refreshes the header
// chip + sidebar balance instantly instead of on next navigation).

import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorMembers } from '@/lib/db/schema'
import { broadcastUserEventToMany } from '@/lib/realtime/user-events'

/** Active member user ids for a company (dedup'd). */
async function activeMemberIds(contractorId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: contractorMembers.userId })
    .from(contractorMembers)
    .where(and(eq(contractorMembers.contractorId, contractorId), eq(contractorMembers.status, 'active')))
  return [...new Set(rows.map((r) => r.userId))]
}

/**
 * Tell a company's members their balance changed, so the header credit chip and
 * sidebar balance refresh live. Fire-and-forget — never throws.
 */
export async function broadcastCreditsChanged(contractorId: string, balance: number): Promise<void> {
  try {
    const userIds = await activeMemberIds(contractorId)
    await broadcastUserEventToMany(userIds, 'credits:changed', { balance })
  } catch (err) {
    console.error('[broadcastCreditsChanged] failed (non-fatal)', err)
  }
}
