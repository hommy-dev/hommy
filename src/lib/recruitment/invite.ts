// Signed invite tokens for the prospect /claim links. HMAC over the prospect id
// with UNSUBSCRIBE_SECRET so a link can't be forged and we can resolve it back
// to the prospect without a DB lookup table. Format: `<prospectId>.<sig>`.

import { createHmac, timingSafeEqual } from 'node:crypto'

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? ''

function sign(prospectId: string): string {
  return createHmac('sha256', SECRET).update(prospectId).digest('base64url')
}

/** Mint a claim token for a prospect. Returns null if no secret is configured. */
export function mintInviteToken(prospectId: string): string | null {
  if (!SECRET) return null
  return `${prospectId}.${sign(prospectId)}`
}

/** Verify a claim token and return the prospect id, or null if invalid. */
export function verifyInviteToken(token: string): string | null {
  if (!SECRET || !token) return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const prospectId = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(prospectId)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return null
    if (!timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  return prospectId
}
