/**
 * Bootstrap an ADMIN user in Supabase Auth and public.users.
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (server-only; never expose to the client)
 *   - DATABASE_URL (same as app; must allow INSERT/UPDATE on public.users)
 *
 * Usage:
 *   pnpm admin:create -- --email=admin@example.com --password='SecurePass1!' --name="Admin User"
 *
 * Or set env (e.g. in .env):
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME
 *
 * If the email already exists in Auth, the script updates public.users to ADMIN
 * and optionally sets a new password when --password is provided.
 */

import 'dotenv/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import { db } from '../src/lib/db'
import { users } from '../src/lib/db/schema'

function parseArgs(argv: string[]) {
  const out: { email?: string; password?: string; name?: string } = {}
  for (const arg of argv) {
    if (arg.startsWith('--email=')) out.email = arg.slice('--email='.length)
    else if (arg.startsWith('--password='))
      out.password = arg.slice('--password='.length)
    else if (arg.startsWith('--name=')) out.name = arg.slice('--name='.length)
  }
  return out
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return v
}

async function findAuthUserIdByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  let page = 1
  const perPage = 200
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })
    if (error) {
      console.error('listUsers failed:', error.message)
      return null
    }
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )
    if (found) return found.id
    if (data.users.length < perPage) break
    page += 1
    if (page > 50) break
  }
  return null
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const email =
    args.email ?? process.env.ADMIN_EMAIL?.trim() ?? ''
  const password =
    args.password ?? process.env.ADMIN_PASSWORD ?? ''
  const fullName =
    args.name?.trim() ||
    process.env.ADMIN_FULL_NAME?.trim() ||
    'Platform Admin'

  if (!email || !email.includes('@')) {
    console.error(
      'Provide a valid email via --email=... or ADMIN_EMAIL in the environment.'
    )
    process.exit(1)
  }
  if (!password || password.length < 8) {
    console.error(
      'Provide a password of at least 8 characters via --password=... or ADMIN_PASSWORD.'
    )
    process.exit(1)
  }

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  let userId: string

  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: 'admin' },
    })

  if (createError) {
    const existingId = await findAuthUserIdByEmail(supabase, email)
    if (!existingId) {
      console.error('createUser failed:', createError.message)
      process.exit(1)
    }
    userId = existingId

    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      userId,
      { password, user_metadata: { full_name: fullName } }
    )
    if (updateErr) {
      console.error('updateUserById (password) failed:', updateErr.message)
      process.exit(1)
    }
    console.log('Auth user already existed; password and metadata updated.')
  } else {
    if (!created.user?.id) {
      console.error('createUser returned no user id')
      process.exit(1)
    }
    userId = created.user.id
    console.log('Created new Auth user:', userId)
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (existing) {
    await db
      .update(users)
      .set({
        email,
        fullName,
        role: 'admin',
        passwordSet: true,
      })
      .where(eq(users.id, userId))
    console.log('Updated public.users row to ADMIN for:', email)
  } else {
    await db.insert(users).values({
      id: userId,
      email,
      fullName,
      role: 'admin',
      passwordSet: true,
    })
    console.log('Inserted public.users row as ADMIN for:', email)
  }

  console.log('\nDone. Sign in at /auth/login with this email and password.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
