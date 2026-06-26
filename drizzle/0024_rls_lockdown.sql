-- Custom SQL migration file, put your code below! --

-- RLS lockdown: enable Row Level Security on tables added after migration 0001,
-- which were left RLS-disabled. With Supabase's default anon/authenticated grants
-- on the public schema, these tables were readable/writable via the public
-- PostgREST + Realtime API using the anon key that ships in the browser bundle.
--
-- The app connects with a role that BYPASSES RLS (same as the 24 tables already
-- protected by 0001), so enabling RLS with no permissive policy = default-deny to
-- anon/authenticated while every server-side query keeps working. Verified: no
-- client-side code reads any of these tables directly (the app uses Drizzle
-- server-side; the browser Supabase client is used only for auth + realtime
-- broadcast channels). Do NOT use FORCE — that would also block the owner/app.

alter table public.purchase_intents enable row level security;
alter table public.integration_connections enable row level security;
alter table public.support_tickets enable row level security;
alter table public.waitlist enable row level security;
alter table public.sms_opt_outs enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.feature_interest enable row level security;
alter table public.external_media enable row level security;
alter table public.external_reviews enable row level security;
alter table public.portfolio_images enable row level security;
alter table public.portfolio_projects enable row level security;
alter table public.cities enable row level security;
alter table public.states enable row level security;

-- spatial_ref_sys is a PostGIS-owned reference table; anon currently has write
-- grants on it (a DELETE/TRUNCATE there would break geography matching). We may
-- not own it, so attempt RLS best-effort and don't fail the migration if denied.
do $$
begin
  alter table public.spatial_ref_sys enable row level security;
exception when others then
  raise notice 'skipped RLS on spatial_ref_sys: %', sqlerrm;
end $$;
