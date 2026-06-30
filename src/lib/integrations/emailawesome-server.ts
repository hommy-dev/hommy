// External email-verification adapter (EmailAwesome). DORMANT by default — used
// only by the recruitment email-finder's escalation path when
// RECRUITMENT_ESCALATION_ENABLED='true' AND a key is set. Free tier ~1,000
// verifications/month. Degrades to a no-op (returns null) when unconfigured, so
// nothing breaks without a key — same discipline as the Places adapters.
//
// NOTE: confirm the exact endpoint + response field names against EmailAwesome's
// API docs when you enable this; the request/response mapping below is the
// generic shape (status + score) and is easy to adjust.

const API_KEY = process.env.EMAILAWESOME_API_KEY ?? ''
const API_URL = process.env.EMAILAWESOME_API_URL ?? 'https://api.emailawesome.com/v1/verify'
const TIMEOUT_MS = 8000

/** True when an external verifier key is configured. */
export function emailVerifierConfigured(): boolean {
  return !!API_KEY
}

type VerifyResponse = {
  // Providers vary; we read whichever of these is present.
  status?: string // e.g. 'valid' | 'deliverable' | 'risky' | 'invalid' | 'catch-all'
  result?: string
  state?: string
  score?: number // 0-100
}

const DELIVERABLE = new Set(['valid', 'deliverable', 'ok', 'safe'])

/**
 * Verify an address. Returns { deliverable, score } or null when unconfigured /
 * on any error (caller treats null as "couldn't verify" and skips the address in
 * the escalation path — we never send an unverified guess).
 */
export async function verifyEmailExternal(
  email: string,
): Promise<{ deliverable: boolean; score: number } | null> {
  if (!API_KEY) return null

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const url = `${API_URL}?email=${encodeURIComponent(email)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
      signal: ctrl.signal,
    })
    if (!res.ok) {
      console.error('[emailawesome] non-OK', res.status)
      return null
    }
    const data = (await res.json()) as VerifyResponse
    const statusStr = (data.status ?? data.result ?? data.state ?? '').toLowerCase()
    const score = typeof data.score === 'number' ? data.score : statusStr && DELIVERABLE.has(statusStr) ? 90 : 0
    return { deliverable: DELIVERABLE.has(statusStr), score }
  } catch (err) {
    console.error('[emailawesome] verify failed', err)
    return null
  } finally {
    clearTimeout(t)
  }
}
