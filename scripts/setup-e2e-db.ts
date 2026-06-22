/**
 * Provision a throwaway Postgres for the e2e smoke run: install the Supabase
 * stubs, apply migrations, and seed the one row the public pages read (the
 * `roofing` service). The Playwright web server then boots against a real,
 * reachable DB instead of crashing with ECONNREFUSED.
 *
 *   DATABASE_URL=… tsx scripts/setup-e2e-db.ts
 *
 * Used by the CI `e2e` job (see .github/workflows/test.yml). Idempotent: stubs
 * are CREATE ... IF NOT EXISTS, migrations skip when applied, the seed upserts.
 * Mirrors `tests/setup-integration.ts` for the non-vitest (dev-server) path.
 */
import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { SUPABASE_STUBS } from '../tests/supabase-stubs'
import { services } from '../src/lib/db/schema'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const sql = postgres(url, {
  max: 1,
  prepare: false,
  connect_timeout: 15,
  onnotice: () => {}, // mute "already exists, skipping" notices
})
const db = drizzle(sql)

async function main() {
  await sql.unsafe(SUPABASE_STUBS)
  console.log('✓ Supabase stubs applied.')

  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('✓ Migrations applied.')

  await db
    .insert(services)
    .values({ slug: 'roofing', name: 'Roofing', subtypes: ['Repair', 'Replacement', 'Inspection'] })
    .onConflictDoNothing()
  console.log('✓ Seeded roofing service.')
}

main()
  .catch((e) => {
    console.error('e2e DB setup failed:')
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => sql.end())
