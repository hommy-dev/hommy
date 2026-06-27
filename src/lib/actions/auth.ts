'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { provisionContractor, provisionHomeowner } from '@/lib/auth/provisioning'

// ============================================================
// SCHEMAS
// ============================================================

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ============================================================
// TYPES
// ============================================================

type FieldErrors = Record<string, string>

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: FieldErrors }

// v2: three authenticated roles. Contractor CRM is /contractor, homeowner
// dashboard is /homeowner, admin console is /admin.
const ROLE_DEFAULT_PATH: Record<'contractor' | 'homeowner' | 'admin', string> = {
  contractor: '/contractor',
  homeowner: '/homeowner',
  admin: '/admin',
}

function getAppOrigin(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (site) return site
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}

// ============================================================
// ACTIONS
// ============================================================

/**
 * Login action - authenticates user; client redirects using returned `redirectTo`.
 */
export async function loginAction(
  formData: FormData
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const fieldErrors: FieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) {
        fieldErrors[key] = issue.message
      }
    }
    return { success: false, error: 'Invalid email or password', fieldErrors }
  }

  const supabase = await createClient()
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !signInData.user) {
    return { success: false, error: 'Could not sign in. Check your email and password.' }
  }

  const [row] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, signInData.user.id))
    .limit(1)

  if (!row) {
    return {
      success: false,
      error: 'Your account is not fully set up. Please contact support.',
    }
  }

  const redirectTo =
    ROLE_DEFAULT_PATH[row.role as keyof typeof ROLE_DEFAULT_PATH] ?? '/'

  return { success: true, data: { redirectTo } }
}

/**
 * Lightweight check used by the post-a-job wizard: is this email already taken
 * by ANY account? Lets us prompt the person to sign in inline instead of failing
 * only at submit time. Case-insensitive. Auth emails are globally unique across
 * roles, so we don't filter by role here — the inline login then steers
 * homeowners through and tells contractors to use their own sign-in.
 */
export async function checkEmailRegistered(
  email: string,
): Promise<{ exists: boolean; role: 'contractor' | 'homeowner' | 'admin' | null }> {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { exists: false, role: null }
  }

  const [row] = await db
    .select({ role: users.role })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1)

  return {
    exists: !!row,
    role: (row?.role as 'contractor' | 'homeowner' | 'admin') ?? null,
  }
}

/**
 * Inline sign-in for the post-a-job wizard. Authenticates an EXISTING homeowner
 * without leaving the wizard and returns their contact details so the form can
 * auto-fill. The session cookie is set here, so the subsequent createLead posts
 * under the now-authenticated homeowner.
 */
export async function loginHomeownerInline(
  formData: FormData,
): Promise<ActionResult<{ fullName: string; email: string; phone: string }>> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { success: false, error: 'Enter your email and password.' }
  }

  const supabase = await createClient()
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error || !signInData.user) {
    return { success: false, error: 'Wrong email or password. Please try again.' }
  }

  const [row] = await db
    .select({
      role: users.role,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.id, signInData.user.id))
    .limit(1)

  if (!row) {
    await supabase.auth.signOut()
    return {
      success: false,
      error: 'Your account is not fully set up. Please contact support.',
    }
  }

  if (row.role !== 'homeowner') {
    // Don't strand a non-homeowner in a half-signed-in state mid-wizard.
    await supabase.auth.signOut()
    return {
      success: false,
      error: 'This email is registered as a contractor. Use the contractor sign-in.',
    }
  }

  return {
    success: true,
    data: {
      fullName: row.fullName ?? '',
      email: row.email,
      phone: row.phone ?? '',
    },
  }
}

const ContractorSignupSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
  agree: z.boolean().refine((v) => v === true, 'Please accept the terms to continue'),
})

/**
 * Contractor signup (email + password). Creates the Supabase auth user, then the
 * company scaffolding (company + owner membership + free plan + signup credits).
 * If the project requires email confirmation, returns needsConfirmation instead
 * of a session.
 */
export async function signupContractor(
  formData: FormData,
): Promise<ActionResult<{ redirectTo?: string; needsConfirmation?: boolean }>> {
  const parsed = ContractorSignupSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    agree: formData.get('agree') === 'on' || formData.get('agree') === 'true',
  })

  if (!parsed.success) {
    const fieldErrors: FieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Check your details and try again',
      fieldErrors,
    }
  }

  const supabase = await createClient()
  const origin = getAppOrigin()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, role: 'contractor' },
      emailRedirectTo: `${origin}/auth/callback?intent=contractor&next=/onboarding`,
    },
  })

  if (error || !data.user) {
    return { success: false, error: error?.message || 'Could not create your account' }
  }

  const referredByCode = ((formData.get('ref') as string | null) ?? '').trim() || undefined
  try {
    await provisionContractor({
      userId: data.user.id,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      passwordSet: true,
      referredByCode,
    })
  } catch (err) {
    console.error('[signupContractor] provisioning failed', err)
    return {
      success: false,
      error: 'Your account was created but setup failed. Please contact support.',
    }
  }

  if (data.session) {
    return { success: true, data: { redirectTo: '/onboarding' } }
  }
  return { success: true, data: { needsConfirmation: true } }
}

/**
 * Returns a Google OAuth URL for contractor signup. The callback (intent=contractor)
 * provisions the company scaffolding after the session is established.
 */
export async function startContractorGoogleSignup(referralCode?: string): Promise<
  ActionResult<{ url: string }>
> {
  const supabase = await createClient()
  const origin = getAppOrigin()
  const ref = referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ''
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback?intent=contractor&next=/onboarding${ref}` },
  })
  if (error || !data.url) {
    return { success: false, error: error?.message || 'Could not start Google sign-in' }
  }
  return { success: true, data: { url: data.url } }
}

/**
 * Finishes a Google sign-in that came through the LOGIN page (no role intent).
 * Such a sign-in creates a Supabase auth user but no app profile, so the callback
 * routes brand-new users to /auth/choose-role, which calls this. Idempotent: if a
 * profile already exists we just return its home. Provisions with passwordSet=false
 * (Google identity, no password).
 */
export async function chooseGoogleRole(
  role: 'homeowner' | 'contractor',
): Promise<ActionResult<{ redirectTo: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Your session expired. Please sign in again.' }
  }

  // Already provisioned (e.g. double submit / refresh) — send them home.
  const [existing] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)
  if (existing) {
    return {
      success: true,
      data: {
        redirectTo:
          ROLE_DEFAULT_PATH[existing.role as keyof typeof ROLE_DEFAULT_PATH] ?? '/',
      },
    }
  }

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? null
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null
  try {
    if (role === 'contractor') {
      await provisionContractor({
        userId: user.id,
        email: user.email ?? '',
        fullName,
        passwordSet: false,
        avatarUrl,
      })
    } else {
      await provisionHomeowner({
        userId: user.id,
        email: user.email ?? '',
        fullName,
        passwordSet: false,
        avatarUrl,
      })
    }
  } catch (err) {
    console.error('[chooseGoogleRole] provisioning failed', err)
    return {
      success: false,
      error: 'Something went wrong setting up your account. Please try again.',
    }
  }

  return {
    success: true,
    data: { redirectTo: role === 'contractor' ? '/onboarding' : '/homeowner' },
  }
}

const HomeownerSignupSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
  agree: z.boolean().refine((v) => v === true, 'Please accept the terms to continue'),
})

/**
 * Homeowner signup (email + password). Creates the Supabase auth user, then the
 * homeowner profile. If the project requires email confirmation, returns
 * needsConfirmation instead of a session.
 */
export async function signupHomeowner(
  formData: FormData,
): Promise<ActionResult<{ redirectTo?: string; needsConfirmation?: boolean }>> {
  const parsed = HomeownerSignupSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    agree: formData.get('agree') === 'on' || formData.get('agree') === 'true',
  })

  if (!parsed.success) {
    const fieldErrors: FieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Check your details and try again',
      fieldErrors,
    }
  }

  const supabase = await createClient()
  const origin = getAppOrigin()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, role: 'homeowner' },
      emailRedirectTo: `${origin}/auth/callback?intent=homeowner&next=/homeowner`,
    },
  })

  if (error || !data.user) {
    return { success: false, error: error?.message || 'Could not create your account' }
  }

  try {
    await provisionHomeowner({
      userId: data.user.id,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      passwordSet: true,
    })
  } catch (err) {
    console.error('[signupHomeowner] provisioning failed', err)
    return {
      success: false,
      error: 'Your account was created but setup failed. Please contact support.',
    }
  }

  if (data.session) {
    return { success: true, data: { redirectTo: '/homeowner' } }
  }
  return { success: true, data: { needsConfirmation: true } }
}

/**
 * Returns a Google OAuth URL for homeowner signup. The callback (intent=homeowner)
 * provisions the homeowner profile after the session is established.
 */
export async function startHomeownerGoogleSignup(
  next: string = '/homeowner',
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const origin = getAppOrigin()
  // Only allow same-app relative paths as the post-login destination.
  const safeNext = next.startsWith('/') ? next : '/homeowner'
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?intent=homeowner&next=${encodeURIComponent(safeNext)}`,
    },
  })
  if (error || !data.url) {
    return { success: false, error: error?.message || 'Could not start Google sign-in' }
  }
  return { success: true, data: { url: data.url } }
}

/**
 * Logout action - signs out user and redirects to home
 */
export async function logoutAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { success: false, error: error.message }
  }

  redirect('/')
}

/**
 * Same as logout but typed for `<form action={...}>` (returns void, not ActionResult).
 */
export async function signOutFormAction(_formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) return
  redirect('/')
}

/**
 * Get OAuth sign in URL for provider
 */
export async function getOAuthSignInUrl(provider: 'google' | 'apple') {
  const supabase = await createClient()
  const origin = getAppOrigin()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: { url: data.url } }
}

/**
 * Reset password action
 */
export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  const email = formData.get('email')

  if (!email || typeof email !== 'string') {
    return { success: false, error: 'Email is required' }
  }

  const supabase = await createClient()
  const origin = getAppOrigin()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
