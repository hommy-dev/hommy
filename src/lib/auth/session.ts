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
  contractor: '/dashboard',
  homeowner: '/home',
  admin: '/admin',
}

/**
 * React cache() deduplicates this across all callers in the same render tree.
 * Layout calls it, page calls it — only one Supabase round-trip + one DB query total.
 */
const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  try {
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
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

export async function getOptionalUser() {
  try {
    return await getAuthUser()
  } catch {
    return null
  }
}
