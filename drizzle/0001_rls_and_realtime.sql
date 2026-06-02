-- ============================================================
-- 0001 — Row Level Security + Realtime authorization (v2)
-- ============================================================
-- The app does all DB work through the privileged `postgres` pooler role
-- (DATABASE_URL), which BYPASSES RLS. These policies lock down the `anon` and
-- `authenticated` roles (PostgREST + Realtime authorization) only.
--
-- v2 identity is membership-based: a user belongs to companies via
-- contractor_members, and may be a homeowner via the homeowners profile. So the
-- helpers are set-returning (a user could belong to multiple companies).
-- ============================================================

-- ---------- helper functions (SECURITY DEFINER → bypass RLS, no recursion) ----------

create or replace function public.current_contractor_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select contractor_id from public.contractor_members
  where user_id = (select auth.uid()) and status = 'active'
$$;--> statement-breakpoint

create or replace function public.current_homeowner_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.homeowners where user_id = (select auth.uid()) limit 1
$$;--> statement-breakpoint

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin')
$$;--> statement-breakpoint

-- true if the caller (as a user, or via any active company membership) is a
-- participant of the conversation. SECURITY DEFINER avoids RLS recursion.
create or replace function public.my_conversation(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and (
        (cp.participant_type = 'user' and cp.participant_id = (select auth.uid()))
        or (cp.participant_type = 'contractor' and cp.participant_id in (select public.current_contractor_ids()))
      )
  )
$$;--> statement-breakpoint

create or replace function public.is_conversation_participant(p_topic text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare cid uuid;
begin
  begin
    cid := nullif(split_part(p_topic, ':', 2), '')::uuid;
  exception when others then
    return false;
  end;
  if cid is null then return false; end if;
  return public.my_conversation(cid);
end;
$$;--> statement-breakpoint

revoke all on function public.current_contractor_ids() from public;--> statement-breakpoint
revoke all on function public.current_homeowner_id() from public;--> statement-breakpoint
revoke all on function public.is_admin() from public;--> statement-breakpoint
revoke all on function public.my_conversation(uuid) from public;--> statement-breakpoint
revoke all on function public.is_conversation_participant(text) from public;--> statement-breakpoint
grant execute on function public.current_contractor_ids() to authenticated;--> statement-breakpoint
grant execute on function public.current_homeowner_id() to authenticated;--> statement-breakpoint
grant execute on function public.is_admin() to authenticated;--> statement-breakpoint
grant execute on function public.my_conversation(uuid) to authenticated;--> statement-breakpoint
grant execute on function public.is_conversation_participant(text) to authenticated;--> statement-breakpoint

-- ---------- enable RLS on every public table ----------

alter table public.users enable row level security;--> statement-breakpoint
alter table public.contractors enable row level security;--> statement-breakpoint
alter table public.contractor_members enable row level security;--> statement-breakpoint
alter table public.contractor_invitations enable row level security;--> statement-breakpoint
alter table public.homeowners enable row level security;--> statement-breakpoint
alter table public.services enable row level security;--> statement-breakpoint
alter table public.plans enable row level security;--> statement-breakpoint
alter table public.subscriptions enable row level security;--> statement-breakpoint
alter table public.credit_transactions enable row level security;--> statement-breakpoint
alter table public.service_areas enable row level security;--> statement-breakpoint
alter table public.contractor_services enable row level security;--> statement-breakpoint
alter table public.leads enable row level security;--> statement-breakpoint
alter table public.lead_recipients enable row level security;--> statement-breakpoint
alter table public.contacts enable row level security;--> statement-breakpoint
alter table public.projects enable row level security;--> statement-breakpoint
alter table public.estimates enable row level security;--> statement-breakpoint
alter table public.conversations enable row level security;--> statement-breakpoint
alter table public.conversation_participants enable row level security;--> statement-breakpoint
alter table public.messages enable row level security;--> statement-breakpoint
alter table public.score_events enable row level security;--> statement-breakpoint
alter table public.reviews enable row level security;--> statement-breakpoint
alter table public.activity_log enable row level security;--> statement-breakpoint
alter table public.notifications enable row level security;--> statement-breakpoint
alter table public.storm_events enable row level security;--> statement-breakpoint

-- ---------- public (anon) read policies ----------

drop policy if exists "services_anon_read_active" on public.services;--> statement-breakpoint
create policy "services_anon_read_active" on public.services for select to anon using (is_active);--> statement-breakpoint

drop policy if exists "plans_anon_read_active" on public.plans;--> statement-breakpoint
create policy "plans_anon_read_active" on public.plans for select to anon using (is_active);--> statement-breakpoint

drop policy if exists "reviews_anon_read_submitted" on public.reviews;--> statement-breakpoint
create policy "reviews_anon_read_submitted" on public.reviews for select to anon using (submitted_at is not null);--> statement-breakpoint

-- ---------- authenticated SELECT policies (scoped; admin sees all) ----------

drop policy if exists "users_self_or_admin_read" on public.users;--> statement-breakpoint
create policy "users_self_or_admin_read" on public.users for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());--> statement-breakpoint

drop policy if exists "contractors_member_or_admin_read" on public.contractors;--> statement-breakpoint
create policy "contractors_member_or_admin_read" on public.contractors for select to authenticated
  using (id in (select public.current_contractor_ids()) or public.is_admin());--> statement-breakpoint

drop policy if exists "contractor_members_company_or_admin_read" on public.contractor_members;--> statement-breakpoint
create policy "contractor_members_company_or_admin_read" on public.contractor_members for select to authenticated
  using (contractor_id in (select public.current_contractor_ids()) or user_id = (select auth.uid()) or public.is_admin());--> statement-breakpoint

drop policy if exists "contractor_invitations_company_or_admin_read" on public.contractor_invitations;--> statement-breakpoint
create policy "contractor_invitations_company_or_admin_read" on public.contractor_invitations for select to authenticated
  using (contractor_id in (select public.current_contractor_ids()) or public.is_admin());--> statement-breakpoint

drop policy if exists "homeowners_self_related_or_admin_read" on public.homeowners;--> statement-breakpoint
create policy "homeowners_self_related_or_admin_read" on public.homeowners for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin()
    or id in (select homeowner_id from public.contacts where contractor_id in (select public.current_contractor_ids()))
    or id in (select l.homeowner_id from public.leads l
              join public.lead_recipients lr on lr.lead_id = l.id
              where lr.contractor_id in (select public.current_contractor_ids()))
  );--> statement-breakpoint

drop policy if exists "services_auth_read" on public.services;--> statement-breakpoint
create policy "services_auth_read" on public.services for select to authenticated using (true);--> statement-breakpoint

drop policy if exists "plans_auth_read" on public.plans;--> statement-breakpoint
create policy "plans_auth_read" on public.plans for select to authenticated using (true);--> statement-breakpoint

drop policy if exists "subscriptions_company_or_admin_read" on public.subscriptions;--> statement-breakpoint
create policy "subscriptions_company_or_admin_read" on public.subscriptions for select to authenticated
  using (contractor_id in (select public.current_contractor_ids()) or public.is_admin());--> statement-breakpoint

drop policy if exists "credit_transactions_company_or_admin_read" on public.credit_transactions;--> statement-breakpoint
create policy "credit_transactions_company_or_admin_read" on public.credit_transactions for select to authenticated
  using (contractor_id in (select public.current_contractor_ids()) or public.is_admin());--> statement-breakpoint

drop policy if exists "service_areas_company_or_admin_read" on public.service_areas;--> statement-breakpoint
create policy "service_areas_company_or_admin_read" on public.service_areas for select to authenticated
  using (contractor_id in (select public.current_contractor_ids()) or public.is_admin());--> statement-breakpoint

drop policy if exists "contractor_services_company_or_admin_read" on public.contractor_services;--> statement-breakpoint
create policy "contractor_services_company_or_admin_read" on public.contractor_services for select to authenticated
  using (contractor_id in (select public.current_contractor_ids()) or public.is_admin());--> statement-breakpoint

drop policy if exists "leads_party_or_admin_read" on public.leads;--> statement-breakpoint
create policy "leads_party_or_admin_read" on public.leads for select to authenticated
  using (
    public.is_admin()
    or homeowner_id = public.current_homeowner_id()
    or awarded_to in (select public.current_contractor_ids())
    or id in (select lead_id from public.lead_recipients where contractor_id in (select public.current_contractor_ids()))
  );--> statement-breakpoint

drop policy if exists "lead_recipients_party_or_admin_read" on public.lead_recipients;--> statement-breakpoint
create policy "lead_recipients_party_or_admin_read" on public.lead_recipients for select to authenticated
  using (
    public.is_admin()
    or contractor_id in (select public.current_contractor_ids())
    or lead_id in (select id from public.leads where homeowner_id = public.current_homeowner_id())
  );--> statement-breakpoint

drop policy if exists "contacts_party_or_admin_read" on public.contacts;--> statement-breakpoint
create policy "contacts_party_or_admin_read" on public.contacts for select to authenticated
  using (contractor_id in (select public.current_contractor_ids()) or homeowner_id = public.current_homeowner_id() or public.is_admin());--> statement-breakpoint

drop policy if exists "projects_party_or_admin_read" on public.projects;--> statement-breakpoint
create policy "projects_party_or_admin_read" on public.projects for select to authenticated
  using (
    public.is_admin()
    or contractor_id in (select public.current_contractor_ids())
    or lead_id in (select id from public.leads where homeowner_id = public.current_homeowner_id())
  );--> statement-breakpoint

drop policy if exists "estimates_party_or_admin_read" on public.estimates;--> statement-breakpoint
create policy "estimates_party_or_admin_read" on public.estimates for select to authenticated
  using (
    public.is_admin()
    or project_id in (select id from public.projects where contractor_id in (select public.current_contractor_ids()))
    or project_id in (select p.id from public.projects p
                      join public.leads l on l.id = p.lead_id
                      where l.homeowner_id = public.current_homeowner_id())
  );--> statement-breakpoint

drop policy if exists "conversations_participant_or_admin_read" on public.conversations;--> statement-breakpoint
create policy "conversations_participant_or_admin_read" on public.conversations for select to authenticated
  using (public.is_admin() or public.my_conversation(id));--> statement-breakpoint

drop policy if exists "conversation_participants_participant_or_admin_read" on public.conversation_participants;--> statement-breakpoint
create policy "conversation_participants_participant_or_admin_read" on public.conversation_participants for select to authenticated
  using (public.is_admin() or public.my_conversation(conversation_id));--> statement-breakpoint

drop policy if exists "messages_participant_or_admin_read" on public.messages;--> statement-breakpoint
create policy "messages_participant_or_admin_read" on public.messages for select to authenticated
  using (public.is_admin() or public.my_conversation(conversation_id));--> statement-breakpoint

drop policy if exists "score_events_company_or_admin_read" on public.score_events;--> statement-breakpoint
create policy "score_events_company_or_admin_read" on public.score_events for select to authenticated
  using (contractor_id in (select public.current_contractor_ids()) or public.is_admin());--> statement-breakpoint

drop policy if exists "reviews_party_or_admin_read" on public.reviews;--> statement-breakpoint
create policy "reviews_party_or_admin_read" on public.reviews for select to authenticated
  using (
    contractor_id in (select public.current_contractor_ids())
    or (reviewer_type = 'homeowner' and reviewer_id = public.current_homeowner_id())
    or public.is_admin()
  );--> statement-breakpoint

drop policy if exists "activity_log_company_or_admin_read" on public.activity_log;--> statement-breakpoint
create policy "activity_log_company_or_admin_read" on public.activity_log for select to authenticated
  using (
    public.is_admin()
    or project_id in (select id from public.projects where contractor_id in (select public.current_contractor_ids()))
  );--> statement-breakpoint

drop policy if exists "notifications_self_or_admin_read" on public.notifications;--> statement-breakpoint
create policy "notifications_self_or_admin_read" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());--> statement-breakpoint

drop policy if exists "storm_events_admin_read" on public.storm_events;--> statement-breakpoint
create policy "storm_events_admin_read" on public.storm_events for select to authenticated
  using (public.is_admin());--> statement-breakpoint

-- ---------- Realtime authorization (private channels) ----------

alter table realtime.messages enable row level security;--> statement-breakpoint

drop policy if exists "realtime_receive_own_user_channel" on realtime.messages;--> statement-breakpoint
create policy "realtime_receive_own_user_channel" on realtime.messages for select to authenticated
  using (realtime.topic() = ('user:' || (select auth.uid())::text));--> statement-breakpoint

drop policy if exists "realtime_receive_conversation_channel" on realtime.messages;--> statement-breakpoint
create policy "realtime_receive_conversation_channel" on realtime.messages for select to authenticated
  using (realtime.topic() like 'chat:%' and public.is_conversation_participant(realtime.topic()));
