/**
 * LAUNCH RESET — wipe every user and all data that belongs to them, for a true
 * fresh start from zero (including the admin), while KEEPING seeded reference
 * data (services, plans, states, cities).
 *
 *   pnpm db:reset-launch              # DRY RUN — prints exactly what it would do
 *   pnpm db:reset-launch -- --yes     # actually do it
 *   pnpm db:reset-launch -- --yes --db-only   # skip Supabase auth deletion
 *
 * What it does (only with --yes):
 *   1. Deletes ALL Supabase Auth users (the real login accounts) — without this,
 *      accounts linger and emails stay taken. This is what makes it "0 users".
 *   2. TRUNCATEs every public table EXCEPT the reference set below (CASCADE +
 *      RESTART IDENTITY). Tables are auto-discovered, so new tables are included
 *      automatically and the script never goes stale.
 *
 * What it KEEPS: services, plans, states, cities (seeded reference data the app
 * needs to function) — and the Supabase auth schema's structure / Drizzle
 * migrations. After running, the app is empty of users/companies/leads/etc. but
 * still has its catalog + geography, ready for the very first real signup.
 *
 * SAFETY: refuses to do anything without --yes (dry-run by default), and prints
 * the target database host + Supabase project so you can confirm BEFORE wiping.
 * Requires DATABASE_URL (+ NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * unless --db-only). DESTRUCTIVE AND IRREVERSIBLE — there is no undo.
 */

import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'
import { db } from '../src/lib/db'

// Seeded reference data the app needs — never wiped.
const KEEP = new Set(['services', 'plans', 'states', 'cities'])

// Extension/system tables that live in `public` but aren't ours — must never be
// truncated. `spatial_ref_sys` is PostGIS's coordinate-system catalog; wiping it
// breaks ST_DWithin / ST_SetSRID (geo lead matching + area outreach).
const SYSTEM_TABLES = new Set(['spatial_ref_sys'])

function hostOf(url: string | undefined): string {
  if (!url) return '(unset)'
  try {
    return new URL(url).host
  } catch {
    return '(unparseable)'
  }
}

/** Every base table in the public schema, minus Drizzle's bookkeeping. */
async function listPublicTables(): Promise<string[]> {
  const rows = (await db.execute(
    sql`select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'`,
  )) as unknown as { table_name: string }[]
  return rows
    .map((r) => r.table_name)
    .filter((t) => !t.toLowerCase().includes('drizzle') && !SYSTEM_TABLES.has(t))
    .sort()
}

/** Delete every Supabase Auth user. Returns how many were removed. */
async function deleteAllAuthUsers(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to delete auth users. ' +
        'Set them, or pass --db-only to skip auth deletion.',
    )
  }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  // Collect all user ids first (deleting while paginating shifts pages).
  const ids: string[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    ids.push(...data.users.map((u) => u.id))
    if (data.users.length < 200 || page > 500) break
  }

  let deleted = 0
  for (const id of ids) {
    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) console.error(`  ! failed to delete auth user ${id}: ${error.message}`)
    else deleted++
  }
  return deleted
}

async function main() {
  const args = process.argv.slice(2)
  const yes = args.includes('--yes')
  const dbOnly = args.includes('--db-only')

  if (!process.env.DATABASE_URL) {
    console.error('[reset-launch] DATABASE_URL is not set.')
    process.exit(1)
  }

  const tables = await listPublicTables()
  const toWipe = tables.filter((t) => !KEEP.has(t))
  const toKeep = tables.filter((t) => KEEP.has(t))

  console.log('\n=== LAUNCH RESET ===')
  console.log('Target database :', hostOf(process.env.DATABASE_URL))
  console.log('Supabase project:', hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL))
  console.log('Delete auth users:', dbOnly ? 'NO (--db-only)' : 'YES')
  console.log(`\nKEEP (${toKeep.length}):`, toKeep.join(', ') || '(none found)')
  console.log(`WIPE (${toWipe.length}):`, toWipe.join(', '))

  if (!yes) {
    console.log('\nDRY RUN — nothing was changed.')
    console.log('Re-run with `--yes` to actually wipe. This is IRREVERSIBLE.')
    process.exit(0)
  }

  // 1) Auth users (do this first; if it fails we haven't touched the DB yet).
  if (!dbOnly) {
    console.log('\n[1/2] Deleting Supabase auth users…')
    const n = await deleteAllAuthUsers()
    console.log(`   → deleted ${n} auth user(s).`)
  } else {
    console.log('\n[1/2] Skipping auth deletion (--db-only).')
  }

  // 2) App data — single TRUNCATE handles FK order; CASCADE is a backstop.
  console.log('[2/2] Truncating app tables (keeping reference data)…')
  const list = toWipe.map((t) => `"${t}"`).join(', ')
  await db.execute(sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`))
  console.log(`   → truncated ${toWipe.length} tables.`)

  console.log('\n✓ Fresh start. 0 users; services/plans/states/cities intact.')
  process.exit(0)
}

main().catch((err) => {
  console.error('[reset-launch] failed:', err)
  process.exit(1)
})
