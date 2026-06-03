import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { provisionContractor, provisionHomeowner } from '@/lib/auth/provisioning'

/**
 * Exchanges Supabase PKCE `code` for a session (OAuth, email confirmation, magic links).
 * Cookies are attached to the redirect response. When intent=contractor (Google
 * signup), provisions the company scaffolding after the session is established.
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

  const redirectUrl = new URL(next, request.url)
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/auth/login?error=callback', request.url))
  }

  // Google signup: no pre-signup step ran, so provision here. Both provisioning
  // functions are idempotent, so existing users pass through untouched.
  if (data.user && (intent === 'contractor' || intent === 'homeowner')) {
    const fullName =
      (data.user.user_metadata?.full_name as string | undefined) ?? null
    try {
      if (intent === 'contractor') {
        await provisionContractor({
          userId: data.user.id,
          email: data.user.email ?? '',
          fullName,
          passwordSet: false,
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
  }

  return response
}
