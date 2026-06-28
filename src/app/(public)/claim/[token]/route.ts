// Prospect claim link: /claim/<signed-token>. A recruited roofer clicks the CTA
// in the cold email → we verify the token, record the click, drop a short-lived
// cookie so signup can attribute the conversion, and redirect into contractor
// signup pre-filled with what we know. Invalid/known tokens just fall through to
// a normal signup (never dead-end). Route handler (not a page) so it can set a
// cookie + redirect.

import { type NextRequest, NextResponse } from 'next/server'
import { verifyInviteToken } from '@/lib/recruitment/invite'
import { getProspectForClaim, markProspectClicked } from '@/lib/recruitment/convert'

const SIGNUP = '/auth/signup/contractor'
/** Cookie read by provisionContractor to attribute the conversion. */
export const RECRUIT_COOKIE = 'recruit_prospect'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params
  const prospectId = verifyInviteToken(token)

  const base = new URL(SIGNUP, req.url)
  if (!prospectId) return NextResponse.redirect(base)

  const prospect = await getProspectForClaim(prospectId).catch(() => null)
  if (!prospect || prospect.alreadyConverted) {
    return NextResponse.redirect(base)
  }

  // Pre-fill what we know (the signup/onboarding can read these if wired).
  if (prospect.companyName) base.searchParams.set('company', prospect.companyName)
  if (prospect.website) base.searchParams.set('website', prospect.website)
  if (prospect.phone) base.searchParams.set('phone', prospect.phone)
  if (prospect.city) base.searchParams.set('city', prospect.city)
  if (prospect.state) base.searchParams.set('state', prospect.state)

  await markProspectClicked(prospectId).catch((err) =>
    console.error('[claim] markClicked failed', err),
  )

  const res = NextResponse.redirect(base)
  // 14 days — long enough to finish signup + email confirmation.
  res.cookies.set(RECRUIT_COOKIE, prospectId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 14 * 24 * 60 * 60,
    path: '/',
  })
  return res
}
