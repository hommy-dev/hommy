/**
 * Applies database migrations during a Vercel PRODUCTION build, BEFORE the new
 * code goes live. This is the first half of the Vercel build command:
 *
 *   pnpm run db:migrate:deploy && pnpm run build   (see vercel.json)
 *
 * Safety:
 *  - Runs ONLY when VERCEL_ENV === "production". Preview builds and local builds
 *    skip it, so production is the only database ever auto-migrated.
 *  - If a migration fails, the script exits non-zero, which fails the build and
 *    prevents a broken deploy from going live.
 *  - Migrations are idempotent (Drizzle records applied ones), so re-running is
 *    safe. Uses prepare:false for the Supabase transaction pooler.
 */
import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

const vercelEnv = process.env.VERCEL_ENV // 'production' | 'preview' | 'development' | undefined

async function main() {
  if (vercelEnv !== 'production') {
    console.log(
      `db:migrate:deploy — skipping (VERCEL_ENV=${vercelEnv ?? 'local'}). Only production is auto-migrated.`,
    )
    return
  }

  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('db:migrate:deploy — DATABASE_URL is not set for the production build.')
    process.exit(1)
  }

  const sql = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 15,
    onnotice: () => {}, // mute harmless "already exists, skipping" notices
  })

  try {
    console.log('db:migrate:deploy — applying migrations to production…')
    await migrate(drizzle(sql), { migrationsFolder: './drizzle' })
    console.log('db:migrate:deploy — ✓ migrations applied (or already up to date).')
  } finally {
    await sql.end()
  }
}

main().catch((e) => {
  console.error('db:migrate:deploy — migration FAILED, aborting deploy:')
  console.error(e)
  process.exit(1)
})
