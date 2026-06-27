import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { provisionContractor, provisionHomeowner } from '@/lib/auth/provisioning'

const ROLE_HOMES: Record<string, string> = {
  contractor: '/contractor',
  homeowner: '/homeowner',
  admin: '/admin',
}

/**
 * Exchanges Supabase PKCE `code` for a session (OAuth, email confirmation, magic links).
 *
 * Three cases:
 * - intent=contractor|homeowner (signup buttons): provision the profile, go to `next`.
 * - no intent (LOGIN page "Continue with Google"): a Supabase auth user exists but
 *   may have no app profile. If a profile exists → their dashboard; if brand new →
 *   /auth/choose-role to pick homeowner/contractor (provisioning happens there).
 *
 * Cookies set during the code exchange are collected and re-applied to whichever
 * redirect we ultimately return.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const intent = url.searchParams.get('intent')
  let next = url.searchParams.get('next') ?? '/'
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/'
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=missing_code', request.url))
  }

  const cookieJar: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookieJar.push(...cookiesToSet)
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) {
    return NextResponse.redirect(new URL('/auth/login?error=callback', request.url))
  }

  let destination = next

  if (intent === 'contractor' || intent === 'homeowner') {
    // Signup-with-Google: no pre-signup step ran, so provision here. Both
    // provisioning functions are idempotent, so existing users pass through.
    const fullName =
      (data.user.user_metadata?.full_name as string | undefined) ?? null
    try {
      if (intent === 'contractor') {
        await provisionContractor({
          userId: data.user.id,
          email: data.user.email ?? '',
          fullName,
          passwordSet: false,
          referredByCode: url.searchParams.get('ref') ?? undefined,
        })
      } else {
        await provisionHomeowner({
          userId: data.user.id,
          email: data.user.email ?? '',
          fullName,
          passwordSet: false,
        })
      }
    } catch (err) {
      console.error(`[auth/callback] ${intent} provisioning failed`, err)
    }
  } else {
    // Login-with-Google (no role intent): route by whether they already have a
    // profile. Brand-new users have no profile yet → let them pick a role.
    try {
      const [profile] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, data.user.id))
        .limit(1)
      destination = profile ? ROLE_HOMES[profile.role] ?? '/' : '/auth/choose-role'
    } catch (err) {
      console.error('[auth/callback] profile lookup failed', err)
      destination = '/auth/choose-role'
    }
  }

  const response = NextResponse.redirect(new URL(destination, request.url))
  cookieJar.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  )
  return response
}
