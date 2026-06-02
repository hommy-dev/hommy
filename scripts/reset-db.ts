/**
 * DEV-ONLY destructive reset. Drops every table + enum + helper function in the
 * `public` schema and the drizzle migration-tracking schema, so a fresh
 * `pnpm db:migrate` re-applies migrations from scratch. Preserves Supabase's
 * own schemas (auth/storage/realtime) and the public-schema grants/default
 * privileges (we drop objects, NOT the schema), so PostgREST access survives.
 *
 *   npx tsx scripts/reset-db.ts --yes
 *
 * Requires DATABASE_URL. Refuses to run without --yes.
 */

import 'dotenv/config'
import postgres from 'postgres'

const RESET = `
do $$
declare r record;
begin
  for r in (select tablename from pg_tables where schemaname = 'public') loop
    execute 'drop table if exists public.' || quote_ident(r.tablename) || ' cascade';
  end loop;
  for r in (
    select t.typname from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'
  ) loop
    execute 'drop type if exists public.' || quote_ident(r.typname) || ' cascade';
  end loop;
end $$;
drop function if exists public.current_contractor_id() cascade;
drop function if exists public.current_contractor_ids() cascade;
drop function if exists public.current_homeowner_id() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.my_conversation(uuid) cascade;
drop function if exists public.is_chat_participant(text) cascade;
drop function if exists public.is_conversation_participant(text) cascade;
drop schema if exists drizzle cascade;
`

async function main() {
  if (!process.argv.includes('--yes')) {
    console.error('Refusing to drop the database without --yes')
    process.exit(1)
  }
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }
  const sql = postgres(url, { prepare: false, max: 1 })
  await sql.unsafe(RESET)
  console.log('✓ public schema + drizzle tracking reset')
  await sql.end()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
