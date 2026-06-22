// ============================================================
// Supabase schema stubs (shared by the integration test setup AND the e2e
// DB-prep script).
//
// The application uses Supabase-managed schemas (auth, realtime, storage) for
// RLS, broadcasts, and file storage. Vanilla Postgres — in our docker-compose
// test container and the CI `postgres` service — has none of those, so the
// migrations fail on the first reference. We create the minimum scaffolding the
// migrations expect:
//   - Schemas exist
//   - Functions like auth.uid() / realtime.topic() return NULL
//   - Tables (realtime.messages, storage.buckets, storage.objects) have the
//     columns the policies reference
//   - The `authenticated` role exists so GRANT ... TO authenticated and
//     CREATE POLICY ... TO authenticated work
//
// We do NOT replicate Supabase's real RLS behavior. Tests run as superuser and
// bypass RLS entirely. These stubs exist purely so the DDL applies cleanly.
// ============================================================
export const SUPABASE_STUBS = `
-- Lead matching uses a PostGIS geography column + ST_Covers (migration 0006
-- runs CREATE EXTENSION too). The test DB image must ship PostGIS
-- (postgis/postgis:* locally and in CI) for this to succeed.
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS storage;

DO $do$ BEGIN
  CREATE ROLE authenticated;
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

DO $do$ BEGIN
  CREATE ROLE anon;
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

DO $do$ BEGIN
  CREATE ROLE service_role;
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

GRANT USAGE ON SCHEMA auth, realtime, storage TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE
  AS $fn$ SELECT NULL::uuid $fn$;

CREATE OR REPLACE FUNCTION realtime.topic() RETURNS text
  LANGUAGE sql STABLE
  AS $fn$ SELECT NULL::text $fn$;

CREATE TABLE IF NOT EXISTS realtime.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  topic text,
  extension text,
  event text,
  payload jsonb,
  inserted_at timestamptz DEFAULT now(),
  user_id uuid
);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[],
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  owner_id text,
  metadata jsonb,
  path_tokens text[],
  version text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[]
  LANGUAGE sql IMMUTABLE
  AS $fn$ SELECT string_to_array(name, '/') $fn$;
`
