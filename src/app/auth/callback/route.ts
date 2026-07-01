import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { provisionContractor, provisionHomeowner, requestContractorWelcome } from '@/lib/auth/provisioning'

const ROLE_HOMES: Record<string, string> = {
  contractor: '/contractor',
  homeowner: '/homeowner',
  admin: '/admin',
}
// Where each role lands right after confirming a signup (no explicit `next`).
const ROLE_SIGNUP_NEXT: Record<string, string> = {
  contractor: '/onboarding',
  homeowner: '/homeowner',
}

/**
 * Establishes a session from a Supabase auth callback, then routes.
 *
 * Two link shapes:
 * - `token_hash` + `type` — EMAIL confirmation / magic link. Verified with
 *   verifyOtp, which is STATELESS: no PKCE code_verifier cookie, so a link opened
 *   on a different device or browser than signup still works (the old `code`/PKCE
 *   flow failed cross-device — that's what the email template must now use).
 * - `code` — OAuth (Google), exchanged via PKCE in the same browser.
 *
 * Intent (which profile to provision, where to land) comes from the `intent`
 * query param on OAuth buttons, or — for email links, which carry no intent — the
 * `role` we stored in the user's metadata at signup. Cookies from the exchange
 * are re-applied to the final redirect.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const otpType = url.searchParams.get('type') as EmailOtpType | null
  const intentParam = url.searchParams.get('intent')
  let next = url.searchParams.get('next') ?? ''
  if (next && (!next.startsWith('/') || next.startsWith('//'))) {
    next = ''
  }

  if (!code && !(tokenHash && otpType)) {
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

  const { data, error } =
    tokenHash && otpType
      ? await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash })
      : await supabase.auth.exchangeCodeForSession(code!)
  if (error || !data.user) {
    // Usually an already-used/expired link. The email is confirmed server-side
    // regardless, so send them to sign in rather than a dead end.
    return NextResponse.redirect(new URL('/auth/login?error=callback', request.url))
  }

  // Intent: explicit param (OAuth buttons), else the role stored at signup
  // (email-confirmation links carry no intent param).
  const roleMeta = data.user.user_metadata?.role as string | undefined
  const intent =
    intentParam === 'contractor' || intentParam === 'homeowner'
      ? intentParam
      : roleMeta === 'contractor' || roleMeta === 'homeowner'
        ? roleMeta
        : null

  let destination = next

  // Google profile photo, if the provider shared one.
  const avatarUrl =
    (data.user.user_metadata?.avatar_url as string | undefined) ??
    (data.user.user_metadata?.picture as string | undefined) ??
    null

  if (intent === 'contractor' || intent === 'homeowner') {
    // Email-confirmation or signup-with-Google. Provisioning is idempotent, so an
    // already-provisioned user (e.g. the email/password path already ran it) just
    // passes through — this only matters for the OAuth-first case.
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
          avatarUrl,
        })
        // Confirmed session now established — send the welcome (idempotent).
        await requestContractorWelcome(data.user.id)
      } else {
        await provisionHomeowner({
          userId: data.user.id,
          email: data.user.email ?? '',
          fullName,
          passwordSet: false,
          avatarUrl,
        })
      }
    } catch (err) {
      console.error(`[auth/callback] ${intent} provisioning failed`, err)
    }
    // Email-confirmation links carry no `next` — send them to the role's home.
    if (!destination) destination = ROLE_SIGNUP_NEXT[intent]
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

      // Backfill the avatar for existing accounts that never captured one
      // (e.g. signed up before we saved it). coalesce never overwrites a set value.
      if (profile && avatarUrl) {
        await db
          .update(users)
          .set({ avatarUrl: sql`coalesce(${users.avatarUrl}, ${avatarUrl})` })
          .where(eq(users.id, data.user.id))
      }
    } catch (err) {
      console.error('[auth/callback] profile lookup failed', err)
      destination = '/auth/choose-role'
    }
  }

  if (!destination) destination = '/'
  const response = NextResponse.redirect(new URL(destination, request.url))
  cookieJar.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  )
  return response
}
