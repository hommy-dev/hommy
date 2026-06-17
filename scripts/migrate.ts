/**
 * Applies pending Drizzle migrations.
 *
 *   pnpm db:migrate
 *
 * We run the migrator ourselves instead of `drizzle-kit migrate` because the
 * only DATABASE_URL we have is the Supabase transaction pooler (port 6543),
 * which doesn't support named prepared statements. drizzle-kit migrate uses
 * them and fails silently (exit 1, no message); a plain client with
 * `prepare: false` works — same setting as src/lib/db/index.ts.
 */
import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set (check your .env).')
  process.exit(1)
}

const sql = postgres(url, {
  max: 1,
  prepare: false,
  connect_timeout: 15,
  onnotice: () => {}, // mute harmless "already exists, skipping" server notices
})
const db = drizzle(sql)

migrate(db, { migrationsFolder: './drizzle' })
  .then(() => console.log('✓ Migrations applied (or already up to date).'))
  .catch((e) => {
    console.error('Migration failed:')
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => sql.end())
