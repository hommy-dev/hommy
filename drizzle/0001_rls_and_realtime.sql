-- ============================================================
-- 0001 — Row Level Security + Realtime authorization
-- ============================================================
-- The app does all DB work through the privileged `postgres` pooler role
-- (DATABASE_URL), which BYPASSES RLS. So these policies do not affect server
-- actions — they lock down the `anon` and `authenticated` roles used by
-- PostgREST (/rest/v1) and by Realtime channel authorization.
--
-- Posture:
--   * RLS enabled on every public table (Supabase advisors flag tables without it).
--   * No write policies for anon/authenticated → all writes are denied on those
--     roles. Writes happen only via the service connection in server actions.
--   * SELECT policies are scoped: a contractor sees only their own rows; admins
--     (public.users.role = 'admin') see everything; anon sees only public
--     reference data (active services) and submitted reviews.
--   * Realtime private channels (`user:<uid>`, `chat:<contactId>`) are authorized
--     via RLS policies on realtime.messages (re-creates the policy the inherited
--     chat/realtime code depends on — see src/lib/realtime/*, chat/channels.ts).
-- ============================================================

-- ---------- helper functions (SECURITY DEFINER → bypass RLS, avoid recursion) ----------

create or replace function public.current_contractor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.contractors where user_id = (select auth.uid()) limit 1
$$;--> statement-breakpoint

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = (select auth.uid()) and role = 'admin'
  )
$$;--> statement-breakpoint

create or replace function public.is_chat_participant(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  begin
    cid := nullif(split_part(p_topic, ':', 2), '')::uuid;
  exception when others then
    return false;
  end;
  if cid is null then
    return false;
  end if;
  return exists (
    select 1 from public.contacts c
    where c.id = cid and c.contractor_id = public.current_contractor_id()
  );
end;
$$;--> statement-breakpoint

revoke all on function public.current_contractor_id() from public;--> statement-breakpoint
revoke all on function public.is_admin() from public;--> statement-breakpoint
revoke all on function public.is_chat_participant(text) from public;--> statement-breakpoint
grant execute on function public.current_contractor_id() to authenticated;--> statement-breakpoint
grant execute on function public.is_admin() to authenticated;--> statement-breakpoint
grant execute on function public.is_chat_participant(text) to authenticated;--> statement-breakpoint

-- ---------- enable RLS on every public table ----------

alter table public.users enable row level security;--> statement-breakpoint
alter table public.services enable row level security;--> statement-breakpoint
alter table public.contractors enable row level security;--> statement-breakpoint
alter table public.service_areas enable row level security;--> statement-breakpoint
alter table public.contractor_services enable row level security;--> statement-breakpoint
alter table public.homeowners enable row level security;--> statement-breakpoint
alter table public.leads enable row level security;--> statement-breakpoint
alter table public.contacts enable row level security;--> statement-breakpoint
alter table public.projects enable row level security;--> statement-breakpoint
alter table public.estimates enable row level security;--> statement-breakpoint
alter table public.messages enable row level security;--> statement-breakpoint
alter table public.activity_log enable row level security;--> statement-breakpoint
alter table public.reviews enable row level security;--> statement-breakpoint
alter table public.storm_events enable row level security;--> statement-breakpoint
alter table public.notifications enable row level security;--> statement-breakpoint

-- ---------- public (anon) read policies ----------

drop policy if exists "services_anon_read_active" on public.services;--> statement-breakpoint
create policy "services_anon_read_active" on public.services
  for select to anon
  using (is_active);--> statement-breakpoint

drop policy if exists "reviews_anon_read_submitted" on public.reviews;--> statement-breakpoint
create policy "reviews_anon_read_submitted" on public.reviews
  for select to anon
  using (submitted_at is not null);--> statement-breakpoint

-- ---------- authenticated SELECT policies (owner-scoped, admin sees all) ----------

drop policy if exists "users_self_or_admin_read" on public.users;--> statement-breakpoint
create policy "users_self_or_admin_read" on public.users
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());--> statement-breakpoint

drop policy if exists "services_auth_read" on public.services;--> statement-breakpoint
create policy "services_auth_read" on public.services
  for select to authenticated
  using (true);--> statement-breakpoint

drop policy if exists "contractors_self_or_admin_read" on public.contractors;--> statement-breakpoint
create policy "contractors_self_or_admin_read" on public.contractors
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());--> statement-breakpoint

drop policy if exists "service_areas_owner_or_admin_read" on public.service_areas;--> statement-breakpoint
create policy "service_areas_owner_or_admin_read" on public.service_areas
  for select to authenticated
  using (contractor_id = public.current_contractor_id() or public.is_admin());--> statement-breakpoint

drop policy if exists "contractor_services_owner_or_admin_read" on public.contractor_services;--> statement-breakpoint
create policy "contractor_services_owner_or_admin_read" on public.contractor_services
  for select to authenticated
  using (contractor_id = public.current_contractor_id() or public.is_admin());--> statement-breakpoint

drop policy if exists "homeowners_related_or_admin_read" on public.homeowners;--> statement-breakpoint
create policy "homeowners_related_or_admin_read" on public.homeowners
  for select to authenticated
  using (
    public.is_admin()
    or id in (select homeowner_id from public.contacts where contractor_id = public.current_contractor_id())
    or id in (select homeowner_id from public.leads where assigned_to = public.current_contractor_id())
  );--> statement-breakpoint

drop policy if exists "leads_assigned_or_admin_read" on public.leads;--> statement-breakpoint
create policy "leads_assigned_or_admin_read" on public.leads
  for select to authenticated
  using (assigned_to = public.current_contractor_id() or public.is_admin());--> statement-breakpoint

drop policy if exists "contacts_owner_or_admin_read" on public.contacts;--> statement-breakpoint
create policy "contacts_owner_or_admin_read" on public.contacts
  for select to authenticated
  using (contractor_id = public.current_contractor_id() or public.is_admin());--> statement-breakpoint

drop policy if exists "projects_owner_or_admin_read" on public.projects;--> statement-breakpoint
create policy "projects_owner_or_admin_read" on public.projects
  for select to authenticated
  using (contractor_id = public.current_contractor_id() or public.is_admin());--> statement-breakpoint

drop policy if exists "estimates_owner_or_admin_read" on public.estimates;--> statement-breakpoint
create policy "estimates_owner_or_admin_read" on public.estimates
  for select to authenticated
  using (
    public.is_admin()
    or project_id in (select id from public.projects where contractor_id = public.current_contractor_id())
  );--> statement-breakpoint

drop policy if exists "messages_owner_or_admin_read" on public.messages;--> statement-breakpoint
create policy "messages_owner_or_admin_read" on public.messages
  for select to authenticated
  using (contractor_id = public.current_contractor_id() or public.is_admin());--> statement-breakpoint

drop policy if exists "activity_log_owner_or_admin_read" on public.activity_log;--> statement-breakpoint
create policy "activity_log_owner_or_admin_read" on public.activity_log
  for select to authenticated
  using (
    public.is_admin()
    or project_id in (select id from public.projects where contractor_id = public.current_contractor_id())
  );--> statement-breakpoint

drop policy if exists "reviews_owner_or_admin_read" on public.reviews;--> statement-breakpoint
create policy "reviews_owner_or_admin_read" on public.reviews
  for select to authenticated
  using (contractor_id = public.current_contractor_id() or public.is_admin());--> statement-breakpoint

drop policy if exists "storm_events_admin_read" on public.storm_events;--> statement-breakpoint
create policy "storm_events_admin_read" on public.storm_events
  for select to authenticated
  using (public.is_admin());--> statement-breakpoint

drop policy if exists "notifications_self_or_admin_read" on public.notifications;--> statement-breakpoint
create policy "notifications_self_or_admin_read" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());--> statement-breakpoint

-- ---------- Realtime authorization (private channels) ----------
-- Clients only RECEIVE broadcasts (the server pushes via the service-role REST
-- endpoint, which bypasses RLS), so a SELECT policy on realtime.messages is all
-- that is needed to authorize a private-channel subscription.

alter table realtime.messages enable row level security;--> statement-breakpoint

drop policy if exists "realtime_receive_own_user_channel" on realtime.messages;--> statement-breakpoint
create policy "realtime_receive_own_user_channel" on realtime.messages
  for select to authenticated
  using (realtime.topic() = ('user:' || (select auth.uid())::text));--> statement-breakpoint

drop policy if exists "realtime_receive_participant_chat_channel" on realtime.messages;--> statement-breakpoint
create policy "realtime_receive_participant_chat_channel" on realtime.messages
  for select to authenticated
  using (
    realtime.topic() like 'chat:%'
    and public.is_chat_participant(realtime.topic())
  );
