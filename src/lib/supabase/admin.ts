import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase admin client. Uses the service role key and therefore
 * MUST NEVER be imported from client components or Route Handlers that run
 * on the edge without protection.
 *
 * Exposes `.auth.admin.*` for user creation, password resets, etc.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
