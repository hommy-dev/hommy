// Prospect claim link: /claim/<signed-token>. A recruited roofer clicks the CTA
// in the cold email → we verify the token, record the click, and drop a
// short-lived cookie so signup can attribute the conversion. The cookie (not URL
// params) carries everything: provisionContractor reads it after signup to link
// the prospect and prefill the company name, phone, and service area. Invalid/
// converted tokens just fall through to a normal signup (never dead-end). Route
// handler (not a page) so it can set a cookie + redirect.

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

  // Load only to guard against a dead/converted token — the actual prefill is
  // applied later from the cookie in provisionContractor, not from URL params.
  const prospect = await getProspectForClaim(prospectId).catch(() => null)
  if (!prospect || prospect.alreadyConverted) {
    return NextResponse.redirect(base)
  }

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
