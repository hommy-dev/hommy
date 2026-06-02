# Homei — Product & Technical Brief

> This document is the single source of truth for building the Homei platform. Read every section before writing any code.
> **v2 (2026-06): the lead/money/identity/messaging model changed substantially from v1.** Where older notes survive, this document wins.

---

## 0. Platform Vision & Naming — READ THIS FIRST

**Homei is a multi-vertical home-services platform — NOT a roofing app.** Roofing is **launch vertical #1**. Once it proves out, we add more home services on the same core (deep cleaning, ceiling/drywall, gutters, and other home-related trades). Every agent must build with that future in mind, even while only roofing ships now.

**Scope rule:** Build **only roofing** right now. Do not build other verticals — but never design anything in a way that would block adding them later.

**Naming rules (non-negotiable):**

- The brand/platform name is **Homei**. Never name the platform, or anything core, after roofing.
- **No `roof`/`roofing` in core names** — not table names, column names, shared enum values, route segments, server-action files, function names, or component names. Use service-neutral vocabulary: `services`, `leads`, `contacts`, `projects`, `estimates`, `service_areas`, `reviews`, `credits`, `plans`, `conversations`.
- Roofing-specific vocabulary is allowed only inside clearly roofing-scoped places (a roofing `service_details` payload, a roofing seed row, a fenced roofing-only module/route).

**Schema rules (multi-vertical from day one):**

- A **`services`** table (the verticals) is the backbone. Roofing is just a seed row. `leads`, `projects`, and the contractor's offered-services join all reference a **`service_id`** — never a hardcoded roofing `job_type` enum.
- **Service-specific intake/estimate fields live in a flexible `service_details` (jsonb)** on `leads` and `estimates`. Each service defines its own shape (validated in app code per service).
- **Roofing-only features are isolated, optional modules.** Storm/weather alerts only make sense for roofing — so `storm_events` and `leads.storm_event_id` are roofing-scoped, nullable, and fenced off, not part of the core lead lifecycle.
- **Shared enums stay service-neutral:** urgency, pipeline `stage`, lead `status`, message `channel`, notification `type`.
- **Money is platform-level and service-neutral:** plans, credits, and subscriptions never reference a vertical.

---

## 1. What We Are Building

A two-sided **home-services platform** connecting homeowners who need work done with local service contractors. It launches with roofing (all current copy, flows, and seed data are roofing), but the architecture is multi-vertical.

Two jobs:

1. **Generate high-intent leads and deliver them to contractors** (homeowner side).
2. **Give contractors a purpose-built CRM + a credit-based engagement economy + (later) growth tools** to win and manage that work (contractor side).

**The business model is a credit economy, not a "leads-included subscription."** Receiving leads is free; contractors spend **credits** to act on them, and the bulk of the charge lands only when they actually **win** the job. Subscriptions exist, but their job is to grant monthly credits + unlock features + seats — not to meter leads. See §3 (Credits) and §4 (Leads).

---

## 2. Why This Model (positioning)

Sourced pain points this platform addresses (these are the defensible, fact-checked versions):

- **Shared leads from Angi/HomeAdvisor are garbage and expensive.** A shared lead is sold to **3–5 contractors**, premium roofing leads run **$100+ each**, pushing CPA into the **$600–$1,200** range at a 10–15% close rate — _paid up front, win or lose_. _(Jobber; LeadTruffle 2026)_
- **Speed to lead wins the job.** Responding within **5 minutes** vs. 30 makes a lead ~**21× more likely** to qualify. Yet measured average first-response times are dismal (HBR's canonical **~42-hour** average), and home-service businesses miss **~27%** of inbound calls. _(HBR 2011; LeadResponseManagement.org)_
- **Closing takes persistence.** **80% of sales need 5+ follow-ups**, but **~44% of reps quit after one**. _(IRC Sales Solutions; SPOTIO)_
- **Most small contractors have no real CRM workflow.** Spreadsheets, sticky notes, group texts.
- **Storm events create lead overflow** with no system to handle it.

**How Homei is different (the honest pitch):**

- **Free to receive leads.** You never pay to _see_ a lead.
- **Pay only when you act, mostly when you win.** A small credit fee to _engage_ (start the conversation), and the **full credit charge only when the homeowner accepts your quote** — i.e. you won the job.
- **Capped competition, not a free-for-all.** A lead is offered to several contractors but only a **fixed maximum** can engage; once full, it locks. The homeowner compares a short list, not a flood.
- **Reputation is enforced.** Ignoring or abandoning leads drops your profile score; consistently winning and responding fast raises it.

> Marketing copy must drop the old "exclusive leads" claim — the v2 model is _capped competition with win-based pricing_, which is a stronger and more honest story than "exclusive."

---

## 3. The Credit Economy (platform-level, service-neutral)

Credits are the **universal currency** of Homei. Today they pay for lead engagement; later they pay for AI-agent help, marketing/social management, and other growth features. Because credits drive billing, they are tracked as an **append-only ledger**, never a single mutable balance.

### 3.1 Plans

- **Plans are data rows (`plans` table), not an enum.** Add/retune tiers with zero migrations.
- **One free plan + three paid plans.** Each plan defines: monthly **credit grant**, **member seat cap**, **feature flags** (`features` jsonb — e.g. `storm_alerts`, `ai_agent`, `marketing`, `analytics`), price, and Stripe price id.
- The **free plan** still lets a company buy credits and operate; it just grants few/no monthly credits and caps seats/features.

### 3.2 Credits

- **Buying credits is independent of any subscription** — a one-time Stripe payment. Free-plan companies can buy as many as they want.
- **Sources** (positive ledger entries): `signup_bonus` (every new company gets a few; a launch-window promo may grant more), `purchase` (Stripe one-time), `plan_grant` (each billing cycle), `promo`, `refund`, `adjustment` (admin).
- **Sinks** (negative entries): `lead_engagement` (small), `lead_won` (full job cost), later `ai_agent`, `marketing`.
- **Expiry policy:** plan-granted credits **expire at cycle end**; purchased credits **never expire**. Spending consumes **oldest-expiring-first (FIFO)**, like airline miles. An Inngest job writes negative `expiry` entries for unspent expired grants.
- **`contractors.credit_balance`** is a **cached projection** of the ledger, updated transactionally on every spend/grant. The ledger is the source of truth.
- **Wallet is company-level** (shared by all members), not per-user.

### 3.3 What credits cost (configurable, never hardcoded)

Per-service credit pricing lives in config/data, so it's tunable without a migration: an `engagement_credit_cost` (small) and an `award_credit_cost` (full job cost) per lead, derived from the service + optionally lead value.

---

## 4. Leads — lifecycle, distribution & pricing

This is the heart of v2. Leads are **not** exclusively assigned at creation.

### 4.1 Lifecycle

1. **Homeowner posts a job** → their account is auto-created (§5.2) → a `lead` is created with the property location and `service_details`.
2. **Free fan-out.** The matching engine offers the lead to **≥3** eligible contractors (matched by `service_id`, `service_areas`, score). Rows are written to `lead_recipients`. **Receiving and viewing are free.**
3. **Engage (small credit charge).** A contractor engages by **starting the conversation / first outreach** → `lead_recipients.status = engaged`, a small `lead_engagement` credit charge, a `project` is created in their CRM, and a `conversation` opens with the homeowner. Engagement takes **one of N capped slots**.
4. **Capped competition.** Only **N** contractors (e.g. 3) may engage. When N slots fill, the lead **locks** (`status = filled`) — no new contractors can engage.
5. **Quote → Win (full credit charge).** Engaged contractors send **quotes** (the `estimates` flow). The homeowner reviews quotes in their dashboard and **accepts one**. **Acceptance is the unambiguous "job won" signal** → that contractor is charged the **full** `award_credit_cost` (`lead_won`), the lead is `awarded`, the other contractors' projects are marked lost.
6. **Cascade on no-response (SLA).** If an offered contractor doesn't respond within **24h after viewing** (or **48h without viewing**), their offer expires and the engine **offers the lead to one more contractor**, and so on — until N engage or the lead closes.

### 4.2 Anti-leakage (the "they did it off-platform" problem)

We charge a _small_ fee to engage and a _full_ fee to win — so the risk is a contractor engaging cheaply, then taking the homeowner off-platform to dodge the full charge. Mitigations, in order of strength:

1. **Quote acceptance is the win signal, and the homeowner triggers it.** Because homeowners have accounts, _they_ accept a quote in their dashboard. The full charge fires on the **homeowner's** action, not the contractor's honesty. This is a natural workflow step, not an artificial button.
2. **Score decay (reputation).** Ignoring a lead without a reason drops the profile score **fast**; repeated ignores (even _with_ reasons) drop it faster. A _pattern_ of "engages many, never produces an accepted quote" looks like leakage and decays score too.
3. _(Optional, later)_ a homeowner outcome prompt at lead close ("did you hire someone?") to catch fully off-platform jobs.

> **We do NOT mask phone numbers.** For home services the contractor visits the property, so they get the number in person regardless — masking adds cost and friction for ~zero benefit. Contact details are shown on engagement.

### 4.3 Reputation / profile score

`contractors.profile_score` is a **cached** value backed by an append-only `score_events` ledger. Events (with configurable deltas): `lead_ignored_no_reason` (−−), `lead_ignored_with_reason` (−), `slow_response`, `fast_engagement` (+), `quote_accepted` (+), `review_received` (± by stars), `off_platform_flag` (−−, homeowner-reported), `pattern_no_quotes` (−). Score gates matching priority and is shown on the public profile.

---

## 5. Identity & Roles

Three identity layers, each with one job. **Separate the person (user) from the company (contractor) from the seat (membership).**

```
users (a person / login)
  └─ contractor_members (seat + role) ──► contractors (the COMPANY: wallet, subscription, leads…)
  └─ homeowners (1:1 profile) ──────────► their job posts, quotes, messages
```

### 5.1 Roles

- **`users.role`** (platform role): `contractor` | `homeowner` | `admin`.
- **`contractor_members.role`** (within-company role): `owner` | `admin` | `member`. Drives who can edit billing, invite teammates, etc. — enforced in server actions, not RLS.
- A **contractor company has many member users**; a user's power inside a company comes from their membership role. The wallet, subscription, leads, contacts, and reviews all belong to the **company**.
- **Admins** are Homei staff. They can see/join anything (admin → anyone messaging, full panel).

### 5.2 Homeowners are authenticated (changed in v2)

Homeowners now have accounts and a **full dashboard** (their job posts + stats, quotes received, messaging, hiring). To keep signup frictionless (homeowners don't want to "make an account"):

- During the post-a-job flow we collect name / email / phone / job details.
- At submit we **auto-create a pre-confirmed auth user** (email auto-verified) and redirect straight to the homeowner dashboard.
- We later prompt them to **set a password**. (`users.password_set` tracks this — the deferred-password pattern the inherited `silent-signup.ts` was built for; adapt it.)
- If the email already has an account, we log them in or ask them to log in.

### 5.3 Membership cardinality

`contractor_members` is many-to-many at the DB level (a user _can_ belong to multiple companies). **Phase 1 enforces "one active membership per user" in app logic.** Keeping the join table many-to-many costs nothing now and is what unlocks contractor-to-contractor work later.

### 5.4 Invitations (Phase 1/2)

`contractor_invitations` lets an owner/admin invite a teammate by email before they have an account: tokenized link → accept → creates the `users` row (if needed) + the `contractor_members` row. Same tokenized-link pattern as quotes/reviews.

---

## 6. Messaging — universal (anyone ↔ anyone)

Anyone can message anyone: homeowner ↔ company, company ↔ company, admin ↔ anyone. One **polymorphic conversation graph** replaces the old narrow contractor↔homeowner `messages` table.

- **`conversations`** — `type` (`direct` | `lead` | `engagement` | `support`) + optional polymorphic `context` (lead/project/engagement it's about).
- **`conversation_participants`** — a participant is a **`user`** (homeowner, admin, or a specific person) **or a `contractor`** (the whole company — any active member reads/sends). `last_read_at` per participant drives unread counts.
- **`messages`** — `sender_type` (`user` | `contractor` | `system`), `sender_id`, `body`, `channel` (`platform` | `sms` | `email`), `external_id`. In-app realtime + SMS/email bridges (Plivo/Resend) for notifications and homeowner reach.

The inherited (currently broken) `chat.ts` / `actions/chat.ts` were written for exactly this `conversations` / `conversation_participants` shape — **adapt them, don't discard them.**

---

## 7. Tech Stack

Use this stack exactly. (Reconciled with the installed codebase.)

- **Framework:** Next.js **16** App Router — `cacheComponents: true` (use `"use cache"`, never `unstable_cache`), `proxy.ts` (not middleware), async `params`/`searchParams`/`cookies`/`headers`. See `CODING_GUIDE.md`.
- **Database:** Supabase (Postgres). **ORM:** Drizzle (`postgres-js`, Supavisor pooler, `prepare: false`).
- **Auth:** Supabase Auth (`@supabase/ssr`). Three roles: contractor, homeowner, admin.
- **Styling:** Tailwind v4 + shadcn/ui. **Fonts:** Inter (sans) + Sebenta (local display) via `src/style/font.ts`.
- **Background jobs:** Inngest (`src/lib/inngest`).
- **File storage:** **Cloudinary** (`src/lib/cloudinary/*`, `next-cloudinary`).
- **Payments:** Stripe — **subscriptions (plan → monthly credit grant + seats + features) AND one-time credit purchases** (Checkout + Customer Portal + webhooks). No Connect / no money between homeowner and contractor.
- **SMS / voice:** **Plivo** (replaces Twilio) where SMS/notifications are needed.
- **Email:** Resend.
- **Push:** Web Push (VAPID; `web-push`, `public/sw.js`).
- **Maps / Geocoding:** Google Places (New) — `PlaceAutocompleteElement`, `@googlemaps/js-api-loader`.
- **Weather:** NOAA / NWS `api.weather.gov` (free, US, no key). Optional Open-Meteo for historical wind.
- **Language:** TypeScript (strict).

---

## 8. Database Schema (Drizzle ORM)

Service-neutral. Money/credits/plans are platform-level. Roofing-specific fields live only in `service_details` jsonb and the roofing-only `storm_events` module.

```typescript
// ───────────── IDENTITY ─────────────

users {
  id: uuid (PK = auth.users.id)
  email: text
  full_name: text
  phone: text
  role: enum('contractor','homeowner','admin')
  password_set: boolean   // false for auto-created homeowners until they set one
  created_at: timestamp
}

// contractors = THE COMPANY (no user_id — membership is separate)
contractors {
  id: uuid
  company_name: text
  bio: text
  logo_url: text
  license_number: text
  license_doc_url: text
  insurance_provider: text
  insurance_policy: text
  insurance_doc_url: text
  years_in_business: integer
  verification_status: enum('pending','verified','rejected')
  stripe_customer_id: text
  credit_balance: integer        // CACHED projection of credit_transactions
  profile_score: integer         // CACHED projection of score_events
  avg_response_time_minutes: integer
  avg_rating: decimal
  total_reviews: integer
  created_at: timestamp
}

// many users per company + role + status
contractor_members {
  id: uuid
  contractor_id: uuid (FK contractors)
  user_id: uuid (FK users)
  role: enum('owner','admin','member')
  status: enum('invited','active','removed')
  invited_by: uuid (nullable FK users)
  created_at: timestamp
  // unique(contractor_id, user_id)
}

contractor_invitations {            // Phase 1/2
  id: uuid
  contractor_id: uuid (FK contractors)
  email: text
  role: enum('owner','admin','member')
  token: text (unique)
  invited_by: uuid (FK users)
  expires_at: timestamp
  accepted_at: timestamp (nullable)
  created_at: timestamp
}

// homeowner = an individual user's profile (1:1 with a homeowner-role user)
homeowners {
  id: uuid
  user_id: uuid (FK users, unique)
  created_at: timestamp
  // contact (name/email/phone) lives on users; job/property location lives on leads
}

// ───────────── MONEY: PLANS, SUBSCRIPTIONS, CREDITS ─────────────

plans {                            // DATA, not an enum — free + 3 paid
  id: uuid
  slug: text (unique)              // 'free','starter','growth','pro'
  name: text
  price_cents: integer             // 0 for free
  billing_interval: enum('month','year')
  stripe_price_id: text (nullable)
  monthly_credits: integer         // granted each cycle, expire at cycle end
  max_members: integer
  features: jsonb                  // { storm_alerts, ai_agent, marketing, analytics, ... }
  is_active: boolean
  sort_order: integer
}

subscriptions {
  id: uuid
  contractor_id: uuid (FK contractors)
  plan_id: uuid (FK plans)
  stripe_subscription_id: text (nullable)   // null for free
  status: enum('active','past_due','canceled','trialing')
  current_period_start: timestamp
  current_period_end: timestamp
  cancel_at_period_end: boolean
  created_at: timestamp
}

// append-only ledger — the SOURCE OF TRUTH for credits
credit_transactions {
  id: uuid
  contractor_id: uuid (FK contractors)
  kind: enum('signup_bonus','purchase','plan_grant','lead_engagement',
             'lead_won','ai_agent','marketing','refund','promo','expiry','adjustment')
  amount: integer                  // signed: + grants/purchases, - spends
  balance_after: integer
  expires_at: timestamp (nullable) // set on plan_grant; null = never expires (FIFO by this)
  source_type: text (nullable)     // 'lead','stripe_payment','subscription',...
  source_id: text (nullable)
  created_by: uuid (nullable FK users)
  created_at: timestamp
}

// ───────────── SUPPLY-SIDE (company-scoped) ─────────────

service_areas {
  id: uuid
  contractor_id: uuid (FK contractors)
  zip_code: text
  lat: double (nullable)           // zip centroid for NWS alerts
  lng: double (nullable)
  created_at: timestamp
  // unique(contractor_id, zip_code)
}

contractor_services {              // which verticals (+ subtypes) a company handles
  contractor_id: uuid (FK contractors)
  service_id: uuid (FK services)
  subtypes: text[]
  // PK(contractor_id, service_id)
}

services {                         // the verticals (roofing = seed row)
  id: uuid
  slug: text (unique)
  name: text
  is_active: boolean
  subtypes: jsonb
  created_at: timestamp
}

// ───────────── LEADS → ENGAGEMENT → PROJECTS → QUOTES ─────────────

leads {
  id: uuid
  homeowner_id: uuid (FK homeowners)
  service_id: uuid (FK services)
  service_details: jsonb           // roofing: { subtype: 'storm_damage', ... }
  urgency: enum('emergency','within_week','within_month','planning')
  // property/job location (lives on the job, not the homeowner)
  address: text  zip_code: text  city: text  state: text  lat: double  lng: double
  photo_url: text
  notes: text
  storm_event_id: uuid (nullable FK storm_events)   // ROOFING-ONLY, fenced
  status: enum('open','filled','awarded','closed','expired')
  engage_slots: integer            // N (capped competition, default 3)
  engagement_credit_cost: integer  // small, snapshot at creation
  award_credit_cost: integer       // full job cost, snapshot at creation
  awarded_to: uuid (nullable FK contractors)
  awarded_at: timestamp (nullable)
  closed_at: timestamp (nullable)
  created_at: timestamp
}

// the fan-out + cascade + per-contractor lead state
lead_recipients {
  id: uuid
  lead_id: uuid (FK leads)
  contractor_id: uuid (FK contractors)
  status: enum('offered','viewed','engaged','declined','expired','lost','won')
  offered_at: timestamp
  viewed_at: timestamp (nullable)
  engaged_at: timestamp (nullable)
  responded_at: timestamp (nullable)
  decline_reason: text (nullable)
  sla_deadline: timestamp          // 24h after view / 48h after offer
  created_at: timestamp
  // unique(lead_id, contractor_id)
}

contacts {                         // company's long-term homeowner record
  id: uuid
  contractor_id: uuid (FK contractors)
  homeowner_id: uuid (FK homeowners)
  tags: text[]
  notes: text
  created_at: timestamp
  // unique(contractor_id, homeowner_id)
}

projects {                         // one contractor's job workspace for a lead
  id: uuid
  contractor_id: uuid (FK contractors)
  contact_id: uuid (FK contacts)
  lead_id: uuid (nullable FK leads)
  service_id: uuid (FK services)
  stage: enum('new_lead','contacted','estimate_sent','in_progress','completed','lost')
  estimate_value: decimal
  notes: text
  follow_up_at: timestamp
  stage_updated_at: timestamp
  created_at: timestamp
}

estimates {                        // = QUOTES. Acceptance is the "job won" signal.
  id: uuid
  project_id: uuid (FK projects)
  service_details: jsonb           // roofing: { roof_size_sqft, measurement_source, materials }
  labor_cost: decimal  materials_cost: decimal  line_items: jsonb
  tax_rate: decimal  subtotal: decimal  tax_amount: decimal  total: decimal
  scope_notes: text  valid_until: timestamp  pdf_url: text
  status: enum('draft','sent','accepted','rejected')
  accept_token: text (unique, nullable)
  accepted_at: timestamp  accepted_ip: text  accepted_user_agent: text
  accepted_snapshot: jsonb
  sent_at: timestamp  created_at: timestamp
}

// ───────────── MESSAGING (universal, polymorphic) ─────────────

conversations {
  id: uuid
  type: enum('direct','lead','engagement','support')
  context_type: text (nullable)    // 'lead' | 'project' | 'engagement'
  context_id: uuid (nullable)
  created_at: timestamp
}

conversation_participants {
  id: uuid
  conversation_id: uuid (FK conversations)
  participant_type: enum('user','contractor')   // user = homeowner/admin/person; contractor = whole company
  participant_id: uuid
  last_read_at: timestamp (nullable)
  joined_at: timestamp
  // unique(conversation_id, participant_type, participant_id)
}

messages {
  id: uuid
  conversation_id: uuid (FK conversations)
  sender_type: enum('user','contractor','system')
  sender_id: uuid (nullable)
  body: text
  channel: enum('platform','sms','email')
  external_id: text (nullable)     // Plivo/Resend id
  created_at: timestamp
}

// ───────────── REPUTATION, REVIEWS, ACTIVITY, NOTIFS ─────────────

score_events {                     // append-only; profile_score is the cached projection
  id: uuid
  contractor_id: uuid (FK contractors)
  kind: enum('lead_ignored_no_reason','lead_ignored_with_reason','slow_response',
             'fast_engagement','quote_accepted','review_received','off_platform_flag','pattern_no_quotes')
  delta: integer
  source_type: text (nullable)  source_id: text (nullable)
  note: text (nullable)
  created_at: timestamp
}

reviews {
  id: uuid
  project_id: uuid (FK projects)
  contractor_id: uuid (FK contractors)        // the reviewed company
  reviewer_type: enum('homeowner','contractor')  // contractor reviewer = c2c (future)
  reviewer_id: uuid                            // homeowner_id or contractor_id
  rating: integer (1-5)
  comment: text
  token: text (unique)
  submitted_at: timestamp
  created_at: timestamp
}

activity_log {
  id: uuid
  project_id: uuid (FK projects)
  actor: enum('system','contractor','homeowner')
  actor_user_id: uuid (nullable FK users)      // which member/homeowner acted
  action: text  metadata: jsonb  created_at: timestamp
}

notifications {                    // per USER (members get their own)
  id: uuid
  user_id: uuid (FK users)
  type: text                       // cross-cutting, grows per feature
  title: text  body: text  action_url: text
  entity_type: text  entity_id: text
  metadata: jsonb  dedup_key: text
  is_read: boolean  sent_in_app: boolean  sent_email: boolean
  created_at: timestamp
}

// ───────────── ROOFING-ONLY MODULE (fenced) ─────────────

storm_events {
  id: uuid
  event_type: enum('hail','high_wind','storm')
  severity: text
  affected_zip_codes: text[]
  detected_at: timestamp  alerts_sent: integer  leads_generated: integer
  created_at: timestamp
}

// ───────────── CONTRACTOR-TO-CONTRACTOR HIRING (Phase 3, planned) ─────────────
// A company hires another company. Reuses `contractors` for both sides.
// Decision needed before building: does money flow through the platform
// (reintroduces Stripe Connect/escrow) or is it facilitation-only?
engagements {                      // do NOT build yet — shape for forward-compat
  id: uuid
  hiring_contractor_id: uuid (FK contractors)
  hired_contractor_id: uuid (FK contractors)
  project_id: uuid (nullable FK projects)   // subcontract of a real job
  service_id: uuid (FK services)
  status: enum('invited','accepted','declined','in_progress','completed','cancelled')
  scope: text  agreed_amount: decimal
  starts_at: timestamp  ends_at: timestamp
  created_by: uuid (FK users)  created_at: timestamp
}
```

---

## 9. Plans & Pricing (illustrative — numbers are config)

| Plan    | Price | Monthly credits | Seats  | Notable features                 |
| ------- | ----- | --------------- | ------ | -------------------------------- |
| Free    | $0    | few / 0         | 1      | CRM, buy credits, basic alerts   |
| Starter | TBD   | small grant     | small  | + storm alerts, estimate builder |
| Growth  | TBD   | medium grant    | medium | + analytics, priority matching   |
| Pro     | TBD   | large grant     | large  | + AI agent, marketing tools      |

Rules: plan credits **expire** at cycle end; purchased credits **roll over**; every signup gets a `signup_bonus`; a launch-window promo grants extra. Credits — not "included leads" — are the unit of value.

---

## 10. Key Automations (Inngest jobs)

- **`lead.created`** — fan out free offers to ≥3 eligible contractors (match by service + area + score); write `lead_recipients`; push/SMS/email each member; set SLA deadlines.
- **`lead.recipient.sla`** — when an offer passes 24h-post-view / 48h-no-view, expire it and offer the lead to one more eligible contractor (cascade) until `engage_slots` fill or no eligibles remain.
- **`lead.engaged`** — on engagement: charge `engagement_credit_cost`, create project + contact + conversation, decrement open slots; lock the lead when slots fill.
- **`quote.accepted`** — on homeowner acceptance: charge winner `award_credit_cost` (`lead_won`), set `leads.awarded_to`, mark other recipients `lost`, project → `in_progress`.
- **`credits.expire`** — cron: write `expiry` entries for unspent expired `plan_grant` lots; refresh `credit_balance`.
- **`subscription.cycle`** — on Stripe invoice paid: write `plan_grant`; on cancel/past_due: update `subscriptions`.
- **`score.recompute`** — apply `score_events` deltas; decay for ignored/abandoned leads.
- **`project.stage_changed`** — log activity; schedule follow-ups; trigger review request 72h after `completed`.
- **`storm.poll`** _(roofing-only)_ — nightly NWS poll by service-area centroid; create `storm_events`; tag + alert.

---

## 11. Real-Time

Use Supabase Realtime (broadcast-based; see `src/lib/realtime/*`) for: new messages, lead-offer badges, credit-balance changes, notification bell, pipeline updates. Private channels (`user:<uid>`, `chat:<conversationId>`) are authorized by RLS on `realtime.messages` (migration `0001`).

---

## 12. Notifications

Every notification goes through one `sendNotification()` core: writes a per-user `notifications` row → checks preferences → push (Web Push) → SMS (Plivo) → email (Resend) per type. Never call Plivo/Resend directly from page handlers — go through Inngest events.

---

## 13. App Structure (routes)

- **Public / marketing:** `/`, `/get-a-quote`, `/contractors`, `/contractors/signup`, `/roofing-contractors/[city]-[state]`.
- **Homeowner (auth, role `homeowner`):** `/home` (or `/me`) dashboard — their job posts + stats, quotes received + accept, messages, profile/password setup. (Frictionless auto-signup from the post flow.)
- **Contractor (auth, role `contractor`):** `/dashboard` — command center, `/dashboard/leads` (offers + engage), contacts, projects (+ quote builder), messages, storm-alerts, reviews, **team** (members + invites), **billing** (plan + credits + purchase), profile, settings.
- **Admin (auth, role `admin`):** `/admin` — leads, contractors (verify), members, storm-events, plans/credits, analytics, settings.
- **Tokenized (no session needed):** quote acceptance link, review submission link, invitation accept link.
- **API route handlers:** `/api/inngest`, `/api/push/*`, `/api/webhooks/stripe`, `/api/webhooks/plivo` (inbound SMS), `/api/webhooks/resend` (inbound email).

---

## 14. Environment Variables

```
# Supabase + DB
NEXT_PUBLIC_SUPABASE_URL  NEXT_PUBLIC_SUPABASE_ANON_KEY  SUPABASE_SERVICE_ROLE_KEY  DATABASE_URL

# Inngest
INNGEST_SIGNING_KEY  INNGEST_EVENT_KEY   (+ INNGEST_DEV=1 locally)

# Stripe (subscriptions + one-time credit purchases)
STRIPE_SECRET_KEY  STRIPE_WEBHOOK_SECRET  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Plivo (SMS / voice)
PLIVO_AUTH_ID  PLIVO_AUTH_TOKEN  PLIVO_SENDER_ID

# Email (Resend)
RESEND_API_KEY  FROM_EMAIL

# Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY  VAPID_PRIVATE_KEY  VAPID_SUBJECT

# Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET  CLOUDINARY_API_KEY  CLOUDINARY_API_SECRET

# App
NEXT_PUBLIC_SITE_URL  FOUNDER_ALERT_EMAIL
```

---

## 15. Future Features (design-compatible, do NOT build now)

All spend **credits** (same ledger) and attribute to **companies/members** (same identity model), so nothing here needs schema lock-in today:

- **AI growth agent** — helps companies manage/grow their business; `ai_agent` credit sink.
- **Marketing / social-media management** — `marketing` credit sink.
- **Content feed** — a social layer for home services (posts/comments/follows), authored by companies/members.
- **Contractor-to-contractor hiring** — the `engagements` table above; decide the payments stance (Connect vs facilitation-only) first.

---

## 16. Build Sequence (where we are)

Done: schema v1 + migration `0000`; RLS/realtime/seed (`0001`); contractor dashboard shell + leads inbox (placeholder pages for the rest); fonts (Inter + Sebenta).

**Next (v2 foundation, pre-launch — cheap to do now):** migrate the schema to this document — identity split (`contractor_members`, homeowners-as-users), credits (`plans`/`subscriptions`/`credit_transactions`), lead economy (`lead_recipients`, lead status machine), universal messaging (`conversations`/`participants`), scoring (`score_events`) — plus updated RLS (membership-based, set-returning helper) and a fresh seed. Then build: homeowner post-a-job + auto-signup, the lead offer/engage/quote/accept loop, credits/billing, and team/members. See `CODING_GUIDE.md` for Next.js 16 patterns.
