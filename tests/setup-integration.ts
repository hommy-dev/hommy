/**
 * Integration test global setup.
 *
 * Runs once per worker before any integration test executes. Verifies the
 * test database is reachable, applies the Supabase-schema stubs the
 * migrations expect, applies pending migrations, and provides a between-
 * test cleanup that truncates application tables.
 *
 * The Drizzle/postgres driver doesn't play nicely with per-test
 * transaction rollback when the upstream uses pgbouncer in transaction
 * mode, so we truncate-then-seed instead. On vanilla Postgres this is
 * fast (<10ms against a near-empty DB) and gives us a clean slate
 * without connection-state shenanigans.
 */

import { execSync } from 'node:child_process'
import { afterEach, beforeAll } from 'vitest'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { SUPABASE_STUBS } from './supabase-stubs'

beforeAll(async () => {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('localhost')) {
    throw new Error(
      'Integration tests refuse to run unless DATABASE_URL points at localhost. ' +
        'Did you forget to source .env.test?',
    )
  }

  // Apply Supabase stubs first so the Drizzle migrations don't fail on
  // missing schemas/functions/tables.
  try {
    await db.execute(sql.raw(SUPABASE_STUBS))
  } catch (err) {
    throw new Error(
      `Failed to install Supabase stubs in test DB: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  // Apply application migrations. Idempotent — drizzle skips already-applied.
  try {
    execSync('pnpm db:migrate', { stdio: 'inherit', env: { ...process.env } })
  } catch (err) {
    throw new Error(`Migration failed: ${err instanceof Error ? err.message : String(err)}`)
  }
})

afterEach(async () => {
  // Let any fire-and-forget promises (`void inngest.send(...)`,
  // `void broadcastUserEvent(...)`, etc.) finish their DB writes
  // before TRUNCATE locks the tables — otherwise we hit deadlocks.
  await new Promise((r) => setTimeout(r, 25))

  // Truncate every public-schema table except drizzle's own migration
  // ledger AND PostGIS's `spatial_ref_sys` — that table lives in `public`
  // but is reference data the `postgis` extension populated (~8500 SRID
  // rows). Wiping it makes ST_Buffer/geography inserts fail with
  // "Cannot find SRID (4326)" on every test after the first. CASCADE
  // handles FK chains (projects → leads → quotes → jobs → messages, etc).
  const result = await db.execute<{ tablename: string }>(sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '__drizzle%'
      AND tablename <> 'spatial_ref_sys'
  `)
  const tables = result.map((r) => r.tablename)
  if (tables.length === 0) return
  const truncateList = tables.map((t) => `"${t}"`).join(', ')
  await db.execute(sql.raw(`TRUNCATE TABLE ${truncateList} RESTART IDENTITY CASCADE`))
})
