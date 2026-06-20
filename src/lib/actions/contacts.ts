'use server'

// Contractor Contacts CRM actions. Read is lazy-loaded into the detail sheet;
// writes are limited to the company's own notes + tags on a contact. Everything
// is scoped to the caller's company (getRequiredUser('contractor')).

import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser } from '@/lib/data/dashboard'
import { getContactDetail, type ContactDetail } from '@/lib/data/contacts'

/** Lazy-load a contact's full record for the detail sheet. */
export async function getContactDetailAction(contactId: string): Promise<ContactDetail | null> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return null
  if (!z.string().uuid().safeParse(contactId).success) return null
  return getContactDetail(contractor.id, contactId)
}

const UpdateSchema = z.object({
  contactId: z.string().uuid(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
})

export type UpdateContactResult = { ok: true } | { ok: false; message: string }

/** Update the company's private notes / tags on a contact. */
export async function updateContact(input: unknown): Promise<UpdateContactResult> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return { ok: false, message: 'Set up your company first.' }

  const parsed = UpdateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Could not save those changes.' }
  const { contactId, notes, tags } = parsed.data

  const set: { notes?: string; tags?: string[] } = {}
  if (notes !== undefined) set.notes = notes
  if (tags !== undefined) set.tags = [...new Set(tags)]
  if (Object.keys(set).length === 0) return { ok: true }

  const updated = await db
    .update(contacts)
    .set(set)
    .where(and(eq(contacts.id, contactId), eq(contacts.contractorId, contractor.id)))
    .returning({ id: contacts.id })
  if (updated.length === 0) return { ok: false, message: 'Contact not found.' }

  revalidatePath('/contractor/contacts')
  return { ok: true }
}
