'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

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

// Homei has two authenticated roles only — homeowners never log in.
// Contractor CRM is /dashboard; admin console is /admin.
const ROLE_DEFAULT_PATH: Record<'contractor' | 'admin', string> = {
  contractor: '/dashboard',
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
