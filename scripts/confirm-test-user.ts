/**
 * Test helper: confirm (or delete) a Supabase auth user by email WITHOUT the
 * confirmation email. Lets you finish the contractor claim/signup flow when
 * you've used a throwaway inbox that never delivers.
 *
 * Requires (from .env): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Run it against whichever DB your .env points at (staging here).
 *
 * Usage:
 *   npx tsx scripts/confirm-test-user.ts --email=you@example.com            # mark email confirmed → can log in
 *   npx tsx scripts/confirm-test-user.ts --email=you@example.com --delete   # remove the auth user (re-signup fresh)
 */

import 'dotenv/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`)

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return v
}

async function findUserByEmail(supabase: SupabaseClient, email: string) {
  const perPage = 200
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < perPage) break
  }
  return null
}

async function main() {
  const email = arg('email')?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    console.error('Provide --email=you@example.com')
    process.exit(1)
  }

  const supabase = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const user = await findUserByEmail(supabase, email)
  if (!user) {
    console.error(`No auth user found for ${email}`)
    process.exit(1)
  }

  if (hasFlag('delete')) {
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) throw new Error(`deleteUser failed: ${error.message}`)
    console.log(`Deleted auth user ${email} (${user.id}). You can sign up again with this email.`)
    return
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, { email_confirm: true })
  if (error) throw new Error(`updateUserById failed: ${error.message}`)
  console.log(`Confirmed ${email} (${user.id}). Now log in at /auth/login with the password you set.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
