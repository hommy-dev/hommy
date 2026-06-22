// Frictionless guest homeowner signup — used by the post-a-job wizard when the
// person posting isn't logged in. We auto-create a PRE-CONFIRMED Supabase auth
// user (no email round-trip), provision the v2 identity rows, set a session
// cookie, and defer the password (users.password_set = false). See
// docs/HOMMY_PLATFORM.md §5.2.
//
// NOTE: this supersedes the painters-era src/lib/auth/silent-signup.ts, which
// still references the dropped homeownerProfiles table and uppercase roles.
// We keep its proven auth MECHANICS (admin createUser → generateLink →
// verifyOtp) but write the v2 schema via provisionHomeowner().

import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { createClient as createSsrClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { provisionHomeowner } from '@/lib/auth/provisioning'
import { normalizeToE164 } from '@/lib/phone/e164'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export type GuestHomeownerInput = {
  fullName: string
  email: string
  phone: string
}

export type GuestHomeownerResult =
  | { ok: true; userId: string }
  | {
      ok: false
      error: 'EMAIL_IN_USE' | 'AUTH_CREATE_FAILED' | 'PROFILE_FAILED' | 'SESSION_FAILED'
    }

/**
 * Creates (or rejects, if the email exists) a homeowner account and signs them
 * in. On success the SSR session cookie is set, so the caller can immediately
 * treat them as the authenticated homeowner.
 */
export async function createGuestHomeowner(
  input: GuestHomeownerInput,
): Promise<GuestHomeownerResult> {
  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim()
  // Store E.164 so SMS works; fall back to the raw input if it won't parse.
  const phone = normalizeToE164(input.phone) ?? input.phone.trim()

  const admin = createAdminClient()

  // 1) Auth user — auto-verified, throwaway password (set later via deferred flow).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createErr || !created.user) {
    const msg = (createErr?.message ?? '').toLowerCase()
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return { ok: false, error: 'EMAIL_IN_USE' }
    }
    console.error('[guestHomeowner] auth-create-failed', createErr)
    return { ok: false, error: 'AUTH_CREATE_FAILED' }
  }

  const userId = created.user.id

  // 2) v2 identity rows (idempotent): users(role=homeowner, password_set=false)
  //    + 1:1 homeowners profile, then the phone. Roll back the auth user on
  //    failure so the email can be reused.
  try {
    await provisionHomeowner({ userId, email, fullName, passwordSet: false })
    if (phone) {
      await db.update(users).set({ phone }).where(eq(users.id, userId))
    }
  } catch (err) {
    console.error('[guestHomeowner] provisioning-failed', err)
    await admin.auth.admin
      .deleteUser(userId)
      .catch((e) => console.error('[guestHomeowner] cleanup-failed', e))
    return { ok: false, error: 'PROFILE_FAILED' }
  }

  // 3) Issue a session without an email round-trip: mint a magic-link token and
  //    immediately verify it on the SSR client, which sets the auth cookies.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error('[guestHomeowner] generateLink-failed', linkErr)
    return { ok: false, error: 'SESSION_FAILED' }
  }

  const ssr = await createSsrClient()
  const { error: verifyErr } = await ssr.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  })
  if (verifyErr) {
    console.error('[guestHomeowner] verify-otp-failed', verifyErr)
    return { ok: false, error: 'SESSION_FAILED' }
  }

  return { ok: true, userId }
}
