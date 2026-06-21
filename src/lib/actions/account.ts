'use server'

// Personal-account actions — role-agnostic (any authenticated user). Contact
// (name/phone) lives on `users`; the password is managed by Supabase Auth.

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { normalizeToE164 } from '@/lib/phone/e164'
import { users } from '@/lib/db/schema'

type FieldErrors = Record<string, string>
type Result =
  | { success: true }
  | { success: false; error: string; fieldErrors?: FieldErrors }

const AccountSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name'),
  phone: z.string().trim().max(30).optional().default(''),
})

export async function updateMyAccount(input: unknown): Promise<Result> {
  const user = await getRequiredUser()

  const parsed = AccountSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { success: false, error: 'Check your details.', fieldErrors }
  }

  const d = parsed.data
  await db
    .update(users)
    .set({ fullName: d.fullName, phone: d.phone ? (normalizeToE164(d.phone) ?? d.phone) : null })
    .where(eq(users.id, user.id))

  return { success: true }
}

const PasswordSchema = z.object({
  password: z.string().min(8, 'Use at least 8 characters'),
})

/**
 * Set or change the current user's password via Supabase Auth (session-based —
 * no current password needed). Flips `users.password_set` for the deferred-
 * password homeowners created during the post-a-job flow.
 */
export async function setPassword(input: unknown): Promise<Result> {
  const user = await getRequiredUser()

  const parsed = PasswordSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid password'
    return { success: false, error: msg, fieldErrors: { password: msg } }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return { success: false, error: error.message }
  }

  if (!user.passwordSet) {
    await db.update(users).set({ passwordSet: true }).where(eq(users.id, user.id))
  }

  return { success: true }
}
