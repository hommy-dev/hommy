'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contractorProfiles,
  homeownerProfiles,
  users,
} from '@/lib/db/schema'

// ============================================================
// SCHEMAS
// ============================================================

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const HomeownerSignupSchema = z.object({
  email: z.string().trim().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters'),
  role: z.literal('HOMEOWNER'),
})

const ContractorSignupSchema = z.object({
  email: z.string().trim().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters'),
  businessName: z
    .string()
    .trim()
    .min(2, 'Business name must be at least 2 characters'),
  role: z.literal('CONTRACTOR'),
})

// ============================================================
// TYPES
// ============================================================

type FieldErrors = Record<string, string>

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: FieldErrors }

const ROLE_DEFAULT_PATH: Record<
  'HOMEOWNER' | 'CONTRACTOR' | 'ADMIN',
  string
> = {
  HOMEOWNER: '/',
  CONTRACTOR: '/contractor',
  ADMIN: '/admin',
}

export type SignupSuccessData = {
  userId: string
  needsEmailConfirmation: boolean
}

function getAppOrigin(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (site) return site
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  )
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

function parseSignupForm(formData: FormData) {
  const roleRaw = formData.get('role')
  const common = {
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
  }

  if (roleRaw === 'CONTRACTOR') {
    return ContractorSignupSchema.safeParse({
      ...common,
      role: 'CONTRACTOR',
      businessName: formData.get('businessName'),
    })
  }

  if (roleRaw === 'HOMEOWNER') {
    return HomeownerSignupSchema.safeParse({
      ...common,
      role: 'HOMEOWNER',
    })
  }

  return {
    success: false as const,
    error: new z.ZodError([
      {
        code: 'custom',
        path: ['role'],
        message: 'Invalid account type',
      },
    ]),
  }
}

/**
 * Signup action — Supabase auth user plus `users` row and role profile (transaction).
 */
export async function signupAction(
  formData: FormData
): Promise<ActionResult<SignupSuccessData>> {
  const parsed = parseSignupForm(formData)

  if (!parsed.success) {
    if ('error' in parsed && parsed.error instanceof z.ZodError) {
      const fieldErrors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !fieldErrors[key]) {
          fieldErrors[key] = issue.message
        }
      }
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid signup data',
        fieldErrors,
      }
    }
    return { success: false, error: 'Invalid signup data' }
  }

  const data = parsed.data
  const supabase = await createClient()

  const postConfirmPath =
    data.role === 'CONTRACTOR' ? '/contractor' : '/'
  const emailRedirectTo = `${getAppOrigin()}/auth/callback?next=${encodeURIComponent(postConfirmPath)}`

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        role: data.role,
      },
      emailRedirectTo,
    },
  })

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message || 'Failed to create account',
    }
  }

  const authUser = authData.user
  const needsEmailConfirmation = !authData.session

  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: authUser.id,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        passwordSet: true,
      })

      if (data.role === 'CONTRACTOR') {
        await tx.insert(contractorProfiles).values({
          userId: authUser.id,
          businessName: data.businessName,
        })
      } else {
        await tx.insert(homeownerProfiles).values({
          userId: authUser.id,
        })
      }
    })
  } catch (err) {
    console.error('[signupAction] DB insert failed after auth signup', err)
    if (isUniqueViolation(err)) {
      return {
        success: false,
        error: 'An account with this email may already exist. Try signing in.',
      }
    }
    return {
      success: false,
      error: 'Account was created but profile setup failed. Please contact support.',
    }
  }

  return {
    success: true,
    data: {
      userId: authUser.id,
      needsEmailConfirmation,
    },
  }
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
