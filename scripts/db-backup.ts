/**
 * One-command database backup — a timestamped pg_dump written to ./backups/.
 * Your free-tier safety net: run this BEFORE any risky migration so you can
 * restore if something goes wrong.
 *
 *   pnpm db:backup                       # backs up DATABASE_URL (.env)
 *   pnpm db:backup "<connection-string>" # backs up a specific database
 *   BACKUP_DATABASE_URL=... pnpm db:backup
 *
 * To back up PRODUCTION, pass the prod connection string (or set
 * BACKUP_DATABASE_URL) — your local .env DATABASE_URL points at the TEST DB.
 *
 * Restore later with:  psql "<connection-string>" -f backups/<file>.sql
 *
 * Requires the `pg_dump` client tool (ships with PostgreSQL / `psql`).
 */
import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const raw = process.argv[2] || process.env.BACKUP_DATABASE_URL || process.env.DATABASE_URL
if (!raw) {
  console.error('No database URL. Pass one as an argument or set BACKUP_DATABASE_URL / DATABASE_URL.')
  process.exit(1)
}

// pg_dump needs a SESSION connection. Supabase's transaction pooler (port 6543)
// can't hold the snapshot pg_dump requires, so switch to the session pooler
// (same host, port 5432) automatically.
let url = raw
try {
  const u = new URL(raw)
  if (u.hostname.endsWith('.pooler.supabase.com') && u.port === '6543') {
    u.port = '5432'
    url = u.toString()
    console.log('Using the session pooler (port 5432) for pg_dump.')
  }
  console.log(`Backing up: ${u.hostname}/${u.pathname.replace('/', '')}`)
} catch {
  console.error('DATABASE URL is not a valid connection string.')
  process.exit(1)
}

// Verify pg_dump exists.
if (spawnSync('pg_dump', ['--version'], { stdio: 'ignore' }).status !== 0) {
  console.error(
    'pg_dump not found. Install the PostgreSQL client tools (which include pg_dump),\n' +
      'or use the Supabase CLI:  supabase db dump --db-url "<url>" -f backup.sql',
  )
  process.exit(1)
}

const dir = resolve(process.cwd(), 'backups')
mkdirSync(dir, { recursive: true })

// Timestamp: YYYYMMDD-HHmmss (local time).
const d = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
const outFile = resolve(dir, `hommy-${stamp}.sql`)

console.log('Running pg_dump…')
const result = spawnSync(
  'pg_dump',
  ['--no-owner', '--no-acl', '--file', outFile, url],
  { stdio: 'inherit' },
)

if (result.status !== 0) {
  console.error('\nBackup FAILED.')
  process.exit(result.status ?? 1)
}

const sizeMb = (statSync(outFile).size / 1024 / 1024).toFixed(2)
console.log(`\n✓ Backup written: backups/hommy-${stamp}.sql (${sizeMb} MB)`)
console.log(`  Restore with:  psql "<connection-string>" -f backups/hommy-${stamp}.sql`)
