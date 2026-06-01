/**
 * Silent homeowner signup.
 *
 * Used by the guest project-posting wizard. Creates an auto-verified Supabase
 * user with no password (throwaway UUID), issues a session via
 * `admin.generateLink` + `verifyOtp` so no email round-trip is needed, and
 * inserts the matching `users` + `homeowner_profiles` rows.
 *
 * Returns the new user's id on success, or an error code the wizard can turn
 * into an inline message ("You already have an account").
 */

import { randomUUID } from 'node:crypto'
import { createClient as createSsrClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/db'
import { homeownerProfiles, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export type SilentSignupInput = {
  email: string
  fullName: string
  phone: string
  /** ISO 3166-1 alpha-2. Defaults to 'US' if caller omits. */
  countryCode?: string
  /** BCP-47 locale (en-US, en-GB, …). Defaults to 'en-US' if omitted. */
  locale?: string
}

export type SilentSignupResult =
  | { ok: true; userId: string }
  | {
      ok: false
      error:
        | 'EMAIL_IN_USE'
        | 'PHONE_IN_USE'
        | 'AUTH_CREATE_FAILED'
        | 'SESSION_FAILED'
        | 'PROFILE_INSERT_FAILED'
    }

export async function silentHomeownerSignup(
  input: SilentSignupInput
): Promise<SilentSignupResult> {
  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim()
  const phone = input.phone.trim()
  const t0 = Date.now()

  console.log('[silentSignup] start', { email, hasPhone: Boolean(phone) })

  const admin = createAdminClient()

  // 1) Create the auth user (auto-verified, throwaway password).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createErr || !created.user) {
    // Supabase returns "User already registered" for existing emails
    const msg = (createErr?.message ?? '').toLowerCase()
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      console.warn('[silentSignup] email-in-use', { email })
      return { ok: false, error: 'EMAIL_IN_USE' }
    }
    console.error('[silentSignup] auth-create-failed', createErr)
    return { ok: false, error: 'AUTH_CREATE_FAILED' }
  }

  const userId = created.user.id
  console.log('[silentSignup] auth-user-created', { userId, email })

  // 2) Insert public.users + homeowner_profiles. If either fails, roll back
  //    the auth user so the email can be reused.
  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        email,
        fullName,
        phone: phone || null,
        role: 'HOMEOWNER',
        passwordSet: false,
        countryCode: (input.countryCode ?? 'US').toUpperCase(),
        locale: input.locale ?? 'en-US',
      })
      await tx.insert(homeownerProfiles).values({ userId })
    })
  } catch (err) {
    const pgError = err as { code?: string; constraint_name?: string }
    console.error('[silentSignup] profile-insert-failed', {
      code: pgError?.code,
      constraint: pgError?.constraint_name,
    })
    await admin.auth.admin.deleteUser(userId).catch((cleanupErr) => {
      console.error('[silentSignup] auth-cleanup-failed', cleanupErr)
    })
    // Surface uniqueness violations as specific errors so the wizard can
    // point the user at the offending field instead of a generic "try again".
    if (pgError?.code === '23505') {
      if (pgError.constraint_name === 'users_phone_unique') {
        return { ok: false, error: 'PHONE_IN_USE' }
      }
      if (pgError.constraint_name === 'users_email_unique') {
        return { ok: false, error: 'EMAIL_IN_USE' }
      }
    }
    return { ok: false, error: 'PROFILE_INSERT_FAILED' }
  }

  console.log('[silentSignup] profiles-inserted', { userId })

  // 3) Issue a session for the new user so they land on /homeowner authed.
  //    `admin.generateLink` returns { properties: { hashed_token } }; we
  //    immediately verify it on the SSR client which sets auth cookies.
  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({ type: 'magiclink', email })

  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error('[silentSignup] generateLink failed', linkErr)
    return { ok: false, error: 'SESSION_FAILED' }
  }

  const ssr = await createSsrClient()
  const { error: verifyErr } = await ssr.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  })

  if (verifyErr) {
    console.error('[silentSignup] verify-otp-failed', verifyErr)
    return { ok: false, error: 'SESSION_FAILED' }
  }

  console.log('[silentSignup] done', {
    userId,
    email,
    tookMs: Date.now() - t0,
  })

  return { ok: true, userId }
}

/**
 * True if a Supabase auth user already exists for this email. Used as a
 * pre-check so the wizard can surface the "sign in" hint before submit.
 * Safe to call on each keystroke (debounced in the UI).
 */
export async function isEmailRegistered(email: string): Promise<boolean> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return false
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, trimmed))
    .limit(1)
  return !!row
}
