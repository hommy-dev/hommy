// Shared get-or-create for a company's homeowner contact (the CRM record). Used
// by both engage (broadcast) and requestDirectQuote (direct hire), inside their
// transactions. Not a server action — a plain helper imported by server code.

import { and, eq } from 'drizzle-orm'
import { contacts } from '@/lib/db/schema'
import type { Tx } from '@/lib/credits/ledger'

/** Get-or-create the company's contact record for this homeowner. */
export async function upsertContact(
  tx: Tx,
  contractorId: string,
  homeownerId: string,
): Promise<string> {
  const [existing] = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.contractorId, contractorId), eq(contacts.homeownerId, homeownerId)))
    .limit(1)
  if (existing) return existing.id

  const [created] = await tx
    .insert(contacts)
    .values({ contractorId, homeownerId })
    .onConflictDoNothing()
    .returning({ id: contacts.id })
  if (created) return created.id

  // Lost an insert race — the row now exists, re-read it.
  const [row] = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.contractorId, contractorId), eq(contacts.homeownerId, homeownerId)))
    .limit(1)
  return row.id
}
