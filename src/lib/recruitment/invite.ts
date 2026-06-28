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
  return safeEqual(sig, sign(prospectId)) ? prospectId : null
}

// ── Unsubscribe tokens (sign the email so /unsubscribe can recover + suppress) ──

function signUnsub(email: string): string {
  return createHmac('sha256', SECRET).update(`unsub:${email}`).digest('base64url')
}

/** Mint an unsubscribe token carrying the (encoded) email. Null if no secret. */
export function mintUnsubscribeToken(email: string): string | null {
  if (!SECRET || !email) return null
  const e = email.trim().toLowerCase()
  return `${Buffer.from(e).toString('base64url')}.${signUnsub(e)}`
}

/** Verify an unsubscribe token and return the email, or null if invalid. */
export function verifyUnsubscribeToken(token: string): string | null {
  if (!SECRET || !token) return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  let email: string
  try {
    email = Buffer.from(token.slice(0, dot), 'base64url').toString('utf8')
  } catch {
    return null
  }
  const sig = token.slice(dot + 1)
  return safeEqual(sig, signUnsub(email)) ? email : null
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}
