import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Matches the user_role enum in src/lib/db/schema.ts (v2: homeowners are
// authenticated — see docs/HOMEI_PLATFORM.md §5).
type Role = 'contractor' | 'homeowner' | 'admin'

const ROLE_HOMES: Record<Role, string> = {
  contractor: '/contractor',
  homeowner: '/homeowner',
  admin: '/admin',
}

/**
 * React cache() deduplicates this across all callers in the same render tree.
 * Layout calls it, page calls it — only one Supabase round-trip + one DB query total.
 */
const getAuthUser = cache(async () => {
  const supabase = await createClient()
  // getClaims() verifies the JWT locally — no network round-trip to Supabase
  // Auth — when the project uses asymmetric JWT signing keys. On the legacy
  // shared secret it falls back to a network call (same result, just slower).
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) return null
  try {
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    return dbUser ?? null
  } catch {
    // DB timeout or connection failure — treat as unauthenticated
    return null
  }
})

export async function getRequiredUser(requiredRole?: Role) {
  const dbUser = await getAuthUser()
  if (!dbUser) redirect('/auth/login')
  if (requiredRole && dbUser.role !== requiredRole) {
    redirect(ROLE_HOMES[dbUser.role as Role])
  }
  return dbUser
}

/**
 * Just the authenticated user's id, straight from the verified JWT claims — no
 * `users` table read. For hot server actions (e.g. sending a message) that only
 * need the id and enforce authorization downstream (the participant check), this
 * skips a DB round-trip. Redirects to login when there's no valid session.
 */
export const getRequiredUserId = cache(async (): Promise<string> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) redirect('/auth/login')
  return userId
})

export async function getOptionalUser() {
  try {
    return await getAuthUser()
  } catch {
    return null
  }
}
