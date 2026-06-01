/**
 * Fast-path session for hot-path server actions (chat send, mark-read).
 *
 * Uses `supabase.auth.getClaims()` — when the Supabase project is on
 * asymmetric JWT keys (ES256/RS256), this performs **local** JWKS
 * verification and skips the network round-trip to Supabase Auth.
 * That shaves ~150-250ms per server action vs `getUser()`.
 *
 * Falls back to a null return on any failure (no redirect) so callers can
 * decide how to handle — a send action returns a typed error; a mark-read
 * becomes a no-op. Pages / layouts should keep using `getRequiredUser()`
 * from `session.ts` since they need the full user row + role redirect.
 *
 * What we trust from the verified token:
 *   - `sub`  — user id (maps to users.id and homeowner_profiles.user_id /
 *              contractor_profiles.user_id)
 *   - `role` — Postgres role ('authenticated'); NOT the app role
 *
 * We intentionally do NOT read the app role (HOMEOWNER / CONTRACTOR /
 * ADMIN) from the JWT because that lives on our own `users.role` column
 * and is mutable without re-issuing the token. Any action that needs the
 * app role must still query `users`. Hot-path chat actions don't.
 */
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type FastSession = {
  userId: string
  /** Postgres role from the JWT (expected: 'authenticated'). */
  pgRole: string
}

/**
 * React cache() dedupes this per-request across layout + page + action
 * so a single server render only pays one JWKS verification.
 */
export const getFastSession = cache(async (): Promise<FastSession | null> => {
  try {
    const supabase = await createClient()
    // getClaims() is the 2026 first-party fast path. On asymmetric-keyed
    // projects it uses the cached JWKS (10-min edge TTL per Supabase docs)
    // and verifies locally — no network call.
    const { data, error } = await supabase.auth.getClaims()
    if (error || !data?.claims?.sub) return null
    return {
      userId: data.claims.sub,
      pgRole: (data.claims.role as string) ?? 'authenticated',
    }
  } catch {
    return null
  }
})

/**
 * Strict variant — throws a typed error rather than null-returning, so
 * server actions get a clean branch to produce a 401-style response.
 */
export async function requireFastSession(): Promise<FastSession> {
  const s = await getFastSession()
  if (!s) throw new UnauthenticatedError()
  return s
}

export class UnauthenticatedError extends Error {
  constructor() {
    super('UNAUTHENTICATED')
    this.name = 'UnauthenticatedError'
  }
}
