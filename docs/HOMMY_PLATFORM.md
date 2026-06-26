# Hommy — Product & Technical Brief

> This document is the single source of truth for building the Hommy platform. Read every section before writing any code.
> **v2 (2026-06): the lead/money/identity/messaging model changed substantially from v1, and most of v2 is now BUILT** (identity split, credits, lead economy, universal messaging, homeowner dashboard, reviews). Where older notes survive, this document wins.
> **Phase-1 lead-economy stance (2026-06, supersedes earlier "capped competition" notes):** leads are free, so we **fan out broadly** (ranked by score, up to a configurable max — no fixed engage cap) and **never expire a lead on a contractor**. A lead ends only when the homeowner **hires** or **closes** it (or a 30-day abandoned-post auto-close). Timing is a single **urgency**-based signal used for the fast-responder bonus + a gentle post-engage quote reminder — **not** a deadline or penalty. Reputation is **carrots over sticks**: speed/quotes/wins raise the score and ranking; we don't punish honest declines or slow-but-real deals.

---

## 0. Platform Vision & Naming — READ THIS FIRST

**Hommy is a multi-vertical home-services platform — NOT a roofing app.** Roofing is **launch vertical #1**. Once it proves out, we add more home services on the same core (deep cleaning, ceiling/drywall, gutters, and other home-related trades). Every agent must build with that future in mind, even while only roofing ships now.

**Scope rule:** Build **only roofing** right now. Do not build other verticals — but never design anything in a way that would block adding them later.

**Naming rules (non-negotiable):**

- The brand/platform name is **Hommy**. Never name the platform, or anything core, after roofing.
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

**How Hommy is different (the honest pitch):**

- **Free to receive leads.** You never pay to _see_ a lead, and a lead never expires on you — it's yours to act on until the homeowner hires or closes it.
- **Pay only when you act, mostly when you win.** A small credit fee to _engage_ (start the conversation), and the **full credit charge only when the homeowner accepts your quote** — i.e. you won the job.
- **Open competition, decided by quality.** A lead is offered broadly to eligible pros (ranked by score); whoever shows up and quotes well wins. The homeowner sees who's interested, each with ratings + profile, and picks.
- **Reputation is rewarded.** Responding fast, quoting, and winning raise your score and bump you up the ranking (more/better lead flow). We don't punish honest declines or slow-but-legitimate deals.

> Marketing copy must drop the old "exclusive leads" claim — the model is _free leads with win-based pricing and quality-ranked competition_, a stronger and more honest story than "exclusive."

---

## 3. The Credit Economy (platform-level, service-neutral)

Credits are the **universal currency** of Hommy. Today they pay for lead engagement; later they pay for AI-agent help, marketing/social management, and other growth features. Because credits drive billing, they are tracked as an **append-only ledger**, never a single mutable balance.

### 3.1 Plans

- **Plans are data rows (`plans` table), not an enum.** Add/retune tiers with zero migrations.
- **One free plan + three paid plans.** Each plan defines: monthly **credit grant**, **member seat cap**, **feature flags** (`features` jsonb — e.g. `storm_alerts`, `ai_agent`, `marketing`, `analytics`), price, and Stripe price id.
- The **free plan** still lets a company buy credits and operate; it just grants few/no monthly credits and caps seats/features.

### 3.2 Credits

- **Buying credits is independent of any subscription** — a one-time Stripe payment. Free-plan companies can buy as many as they want.
- **Sources** (positive ledger entries): `signup_bonus` (**50**, never expires — every new company), `promo` (**250** launch bonus, **expires 4 months** after signup), `purchase` (one-time top-up), `plan_grant` (each billing cycle; free plan = **10**/mo), `refund`, `adjustment` (admin). Signup + launch promo = **300 starting credits**.
- **v1 has NO live payments.** Buying credits is fully built in the UI, but "Continue to payment" records a `purchase_intent` and notifies platform admins instead of charging — no Stripe/PSP account yet (Pakistan founder; US customers → a Merchant-of-Record like Paddle/Lemon Squeezy, or Stripe Atlas, is the likely later route). Admins settle a request by hand: take payment offline, then **grant the credits from `/admin/credits`** (kind `purchase`, which marks the intent fulfilled).
- **Sinks** (negative entries): `lead_engagement` (small), `lead_won` (full job cost), later `ai_agent`, `marketing`.
- **Expiry policy:** plan-granted credits **expire at cycle end**; purchased credits **never expire**. Spending consumes **oldest-expiring-first (FIFO)**, like airline miles. An Inngest job writes negative `expiry` entries for unspent expired grants.
- **`contractors.credit_balance`** is a **cached projection** of the ledger, updated transactionally on every spend/grant. The ledger is the source of truth.
- **Wallet is company-level** (shared by all members), not per-user.

### 3.3 What credits cost (configurable, never hardcoded)

**1 credit = $1.** Pricing lives in config (`src/lib/leads/pricing.ts`), tunable without a migration:

- **Engagement (unlock chat) — flat.** A small `engagementCreditCost` (roofing: **1**), SNAPSHOT onto the lead at creation. Engaging gates ONLY on this — see §4.1.
- **Win fee — a percentage of the accepted quote, computed AT ACCEPTANCE** (not a snapshot, so it scales with the real job value). `computeAwardCost()` = `clamp(round(pct × acceptedQuoteTotal), minCredits, maxCredits) − engagementCreditCost`. Current policy (`AWARD_PRICING`): **pct 2.5%**, **floor 30**, **cap 290**. The engagement credits the winner already paid are credited toward the fee, so the winner's TOTAL cost to win equals the clamped fee (e.g. a $9,000 roof → fee 225 cr, 1 already paid → 224 cr charged on accept). A losing engager only ever paid the 1.
- `leads.award_credit_cost` is **deprecated** (kept at its 0 default); the win charge no longer reads it.

---

## 4. Leads — lifecycle, distribution & pricing

This is the heart of the model. Leads are **not** exclusively assigned, **not** capped, and **do not expire** on contractors.

### 4.1 Lifecycle

1. **Homeowner posts a job** → their account is auto-created (§5.2) → a `lead` is created with the property location and `service_details`.
2. **Free, broad fan-out.** The matching engine offers the lead to every eligible contractor (matched by `service_id` + `service_areas` geography + verified), **ranked by score, up to `LEAD_FANOUT.maxRecipients`** (config, default 25 — set high to reach all). Rows are written to `lead_recipients`. **Receiving and viewing are free.** A homeowner is never left waiting on a tiny handful who might all ghost.
3. **Engage (small credit charge).** A contractor engages by clicking **Chat** (a confirm discloses the cost + that it unlocks the homeowner's contact) → `lead_recipients.status = engaged`, a small `lead_engagement` charge, a `project` is created in their CRM, a `contact` is recorded, and a `conversation` opens with the homeowner. **No cap, no lock** — any offered contractor may engage until the lead is awarded or closed. Engaging gates **only** on the engagement credits; the win fee is settled later (§3.3) and may push the balance negative — a **negative balance blocks taking new leads** until the company settles up.
4. **Viewing is telemetry only.** Opening an offered lead's detail stamps `viewed_at` (powers the homeowner's "X pros viewed your job" signal and a small softening of reputation), but it does **not** start or shorten any deadline.
5. **Quote → Win (full credit charge).** Engaged contractors send **quotes** (the `estimates` flow). The quote appears as an inline **quote card** in the conversation; the homeowner **accepts it right there** (or from the job detail). **Acceptance is the unambiguous "job won" signal** → that contractor is charged the **win fee** (a % of the accepted quote total, computed at acceptance — §3.3) via `lead_won`, the lead is `awarded`, the other engaged contractors' recipients/projects are marked `lost`. Sending a new quote **supersedes** the company's prior active quote (one acceptable quote per company per job).
6. **No expiry; the homeowner is in control.** A lead stays live (engageable) until the homeowner **hires** (accepts a quote) or **closes** it ("I hired someone / no longer needed"). The only system close is an **abandoned-post auto-close** after `ABANDONED_LEAD_DAYS` (30) with zero engagement — hygiene, not a contractor deadline. After engaging, if a pro hasn't quoted within an urgency-based window they get one gentle **quote reminder** (no penalty).
7. **Complete → review.** The contractor marks the won job `completed`; this posts an in-thread completion note + an inline **review card**, and notifies the homeowner (in-app + email). The homeowner reviews inline in the chat or from the job detail; a tokenized email link 72h later is the fallback. One review per project (inline + email converge on the same row).

**Timing knobs (config in `tunables.ts`, urgency-tiered — bonus/reminder only, never a deadline):**
- **Fast-responder bonus window** (engage within this → score bonus): emergency 4h · this-week 24h · this-month 48h · planning 72h.
- **Post-engage quote-reminder window**: emergency 24h · this-week 72h · this-month 5d · planning 7d.

### 4.2 Anti-leakage (the "they did it off-platform" problem)

We charge a _small_ fee to engage and a _full_ fee to win — so the risk is a contractor engaging cheaply, then taking the homeowner off-platform to dodge the full charge. Mitigations, in order of strength:

1. **Quote acceptance is the win signal, and the homeowner triggers it.** Because homeowners have accounts, _they_ accept a quote (inline in the chat / job detail). The full charge fires on the **homeowner's** action, not the contractor's honesty. This is a natural workflow step, not an artificial button.
2. **In-product nudges.** The homeowner's "what's next" guidance explicitly says to keep the quote + acceptance on Hommy ("never pay or agree off-platform").
3. **Reputation (carrots).** Winning + good reviews raise the score; an off-platform flag (homeowner-reported) drops it hard.
4. **Homeowner close action.** A "Close job / I hired someone" control gives an outcome signal (and the future hook to catch fully off-platform jobs).

> **We do NOT mask phone numbers.** For home services the contractor visits the property, so they get the number in person regardless — masking adds cost and friction for ~zero benefit. Contact details unlock on engagement (hidden on not-yet-engaged leads).

### 4.3 Reputation / profile score

`contractors.profile_score` is a **cached** value backed by an append-only `score_events` ledger. **Carrots over sticks** — speed and outcomes raise it; we don't punish honest behavior or slow-but-real deals (no expiry penalties). Configurable deltas (`SCORE_DELTAS`):

- `fast_engagement` **+5** (engaged within the urgency fast-window) / a normal in-window engage **+3**
- `quote_accepted` **+15** (the outcome we want)
- `review_received` **± by stars** ((rating−3)×4)
- `lead_ignored_with_reason` **0** — declining _with_ a reason is honest + cascades the lead fast, so it's neutral
- `lead_ignored_no_reason` **−3** (declined with no reason)
- `off_platform_flag` **−25** (homeowner-reported)
- `pattern_no_quotes` (reserved, soft) — for a _pattern_ of engaging and never quoting

Score gates **matching/ranking priority** (fast, reliable pros surface first → more lead flow) and is shown on the public profile. The `score_events` enum still includes legacy `slow_response`; it's no longer emitted (no expiry).

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
- **Admins** are Hommy staff. They can see/join anything (admin → anyone messaging, full panel).

### 5.2 Homeowners are authenticated (changed in v2 — BUILT)

Homeowners now have accounts and a **full dashboard**: a **Jobs** board (a tabbed table mirroring the contractor's, posted → done) with per-job detail, **messaging**, and hiring. Quotes are **not** a separate page — they're viewed and accepted **inline in each job's chat** (quote card) and the job detail. The job detail shows each interested contractor with a **rating + verified badge + View profile**, a personalized "what's next" guidance banner, a progress timeline, and a **Close job** action. To keep signup frictionless (homeowners don't want to "make an account"):

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

- **`conversations`** — `type` (`direct` | `lead` | `engagement` | `support`) + optional polymorphic `context`. The job/lead workspace conversation uses **`context_type = 'project'`, `context_id = projects.id`** (created at engage). The job control panel + all rich cards key off this — use `'project'`, not `'lead'`.
- **`conversation_participants`** — a participant is a **`user`** (homeowner, admin, or a specific person) **or a `contractor`** (the whole company — any active member reads/sends). `last_read_at` per participant drives unread counts.
- **`messages`** — `sender_type` (`user` | `contractor` | `system`), `sender_id`, `body`, `channel` (`platform` | `sms` | `email`), `external_id`, and a structured **`meta` jsonb** for rich cards (see below). In-app realtime + SMS/email bridges (Twilio/Resend).

**Rich message `meta` (the `MessageMeta` union, rendered as cards in the thread):**
- `kind: 'quote'` — the inline quote card (`estimateId`, `total`, `status`). Homeowner **accepts / views** it here; aligned to the contractor's side; status copy personalized per viewer ("Awaiting your decision" vs "Awaiting the homeowner's decision").
- `kind: 'event'` — a lifecycle auto-message (`quote_accepted`, `job_completed`, `quote_superseded`) owned by the triggering party (`actorType`/`actorId`), so it renders as a **left/right bubble on their side** with text **personalized per viewer** (e.g. "You accepted…" vs "<Homeowner> accepted your quote — you won!"). Replaces the old centered "system note".
- `kind: 'review'` — the inline review card posted at completion; the homeowner rates in-thread; flips to a read-only thank-you once submitted (and never re-prompts if already reviewed via any path).

**Optimistic + realtime:** sends are optimistic (no "sending…" status). A lifecycle message refetches the thread's job panel + message meta so the header actions (Accept / Mark completed), timeline, and card states update live for both parties.

> History: the inherited `chat.ts` / `actions/chat.ts` were adapted into this `conversations` / `conversation_participants` graph — messaging is built, not a stub.

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
- **SMS:** **Twilio** where SMS/notifications are needed (`sendSms` in `src/lib/notifications/sms.ts`; Twilio is the only provider, falling back to a logging no-op when unconfigured).
- **Email:** Resend.
- **Push:** Web Push (VAPID; `web-push`, `public/sw.js`).
- **Maps / Geocoding:** Google Places (New) — `PlaceAutocompleteElement`, `@googlemaps/js-api-loader`.
- **Weather:** NOAA / NWS `api.weather.gov` (free, US, no key). Optional Open-Meteo for historical wind.
- **Language:** TypeScript (strict).

---

## 8. Database Schema (Drizzle ORM)

**Source of truth: `src/lib/db/schema.ts`** (and `drizzle/` for migrations). Don't
duplicate column-level detail here — it drifts. This is the high-level map; read
the code for exact columns, types, and indexes.

Service-neutral by design: money, credits, and plans are platform-level; anything
roofing-specific lives in `service_details` jsonb or the roofing-only
`storm_events` module (see §0). Money = decimal strings (parse for display only);
credits = integers; the credit ledger is append-only. RLS is enabled on every app
table — the app role bypasses it via the service role (see
`drizzle/0001_rls_and_realtime.sql` + `0024_rls_lockdown.sql`).

**Tables by domain:**

- **Identity:** `users`, `homeowners`, `contractors`, `contractor_members`, `contractor_invitations`
- **Service config:** `services`, `contractor_services`, `service_areas`, `states`, `cities`
- **Credits & billing:** `credit_transactions` (append-only ledger), `plans`, `subscriptions`, `purchase_intents`
- **Leads & jobs:** `leads`, `lead_recipients`, `contacts`, `projects`, `estimates`
- **Messaging:** `conversations`, `conversation_participants`, `messages`
- **Reputation:** `reviews`, `score_events`, `external_reviews`, `external_media`
- **Portfolio:** `portfolio_projects`, `portfolio_images`
- **Comms & ops:** `notifications`, `push_subscriptions`, `sms_opt_outs`, `integration_connections`, `activity_log`
- **Roofing-only:** `storm_events`
- **Support & growth:** `support_tickets`, `waitlist`, `feature_interest`, `guest_signup_attempts`


---

## 9. Plans & Pricing (illustrative — numbers are config)

| Plan    | Price | Monthly credits | Seats  | Notable features                 |
| ------- | ----- | --------------- | ------ | -------------------------------- |
| Free    | $0    | 10              | 3      | CRM, buy credits, basic alerts   |
| Starter | TBD   | small grant     | small  | + storm alerts, estimate builder |
| Growth  | TBD   | medium grant    | medium | + analytics, priority matching   |
| Pro     | TBD   | large grant     | large  | + AI agent, marketing tools      |

Rules: plan credits **expire** at cycle end; purchased credits **roll over**; every signup gets a **50**-credit `signup_bonus` (never expires) + a **250**-credit launch `promo` (**expires 4 months** out) = **300 to start**; spends are FIFO (oldest-expiring first). Credits — not "included leads" — are the unit of value. **v1 has no live payments** (see §3.2): the Buy UI records a request and admins grant manually from `/admin/credits`.

---

## 10. Key Automations (Inngest jobs)

- **`lead.created`** — fan out free offers broadly to eligible contractors (match by service + area geography + verified, ranked by score, up to `LEAD_FANOUT.maxRecipients`); the `lead_recipients` rows are written inline in `createLead`, so this job handles the async notify (push/SMS/email + a live `lead:new` badge) per member. (Emergencies also SMS.)
- **`lead.recipient.sla`** — housekeeping cron (no expiry, no cascade): (1) **quote reminder** — one gentle nudge to an engaged pro who hasn't quoted by the urgency window (no penalty); (2) **abandoned-post cleanup** — auto-close an `open` lead older than `ABANDONED_LEAD_DAYS` (30) with **zero** engagement.
- **`lead.engaged`** (inline in `engageLead`) — charge `engagement_credit_cost`, create project + contact + conversation; notify the homeowner. No slots/lock.
- **`quote.submitted`** — notify the homeowner of a new quote (deep-links into the chat, where they View/Accept).
- **`quote.accepted`** — on homeowner acceptance: charge winner `award_credit_cost` (`lead_won`), set `leads.awarded_to`, mark other recipients `lost`, project → `in_progress`; notify the **winner** ("you won"), the **losers** ("not selected"), AND the **homeowner** ("you're hired — quote accepted").
- **completion** (inline in `advanceProjectStage` → `completed`) — post an in-thread completion event + review card; notify the homeowner (in-app + email); schedule the review request.
- **`review.request` / submission** — 72h after `completed`, create a pending review row + tokenized email link; inline or token submission recomputes the contractor's cached `avg_rating`/`total_reviews` and records `review_received`.
- **`credits.expire`** — daily cron (BUILT): FIFO reconciliation — write negative `expiry` entries for credits left unspent in lapsed lots (`plan_grant` + the launch `promo`), refresh `credit_balance`, broadcast `credits:changed`. Idempotent; skips companies with a non-positive balance.
- **`subscription.cycle`** — on Stripe invoice paid: write `plan_grant`; on cancel/past_due: update `subscriptions`.
- **`storm.poll`** _(roofing-only)_ — nightly NWS poll by service-area centroid; create `storm_events`; tag + alert.

---

## 11. Real-Time

Use Supabase Realtime (broadcast-based; see `src/lib/realtime/*`) for: new messages, lead-offer badges, credit-balance changes, notification bell, pipeline updates. Private channels (`user:<uid>`, `chat:<conversationId>`) are authorized by RLS on `realtime.messages` (migration `0001`).

---

## 12. Notifications

Every notification goes through one `sendNotification()` core: writes a per-user `notifications` row → checks preferences → push (Web Push) → SMS (Twilio) → email (Resend) per type. Never call Twilio/Resend directly from page handlers — go through Inngest events.

---

## 13. App Structure (routes)

`src/app` is organized with route groups by audience (the group name is NOT in the URL): `(public)/` for marketing, `auth/` for auth flows, and `(dashboard)/{contractor,homeowner,admin}/` for the three authenticated areas. So the contractor area lives at `src/app/(dashboard)/contractor/` and serves `/contractor`.

- **Public / marketing:** `/`, `/get-a-quote`, `/contractors`, `/contractors/signup`, `/roofing-contractors/[city]-[state]`. (`src/app/(public)/`)
- **Homeowner (auth, role `homeowner`):** `/homeowner` dashboard, `/homeowner/requests` — the **Jobs** board (tabbed table; quotes are accepted inline in chat/detail, so there is **no** `/homeowner/quotes` page), `/homeowner/messages`, settings (profile/password). (Frictionless auto-signup from the post flow.) (`src/app/(dashboard)/homeowner/`)
- **Contractor (auth, role `contractor`):** `/contractor` — command center, **`/contractor/jobs`** — the unified board (offers → engage → quote → won → done; **Leads + Projects were merged into it**, so `/contractor/leads` redirects here), contacts, messages, storm-alerts, reviews, **team** (members + invites), **billing** (plan + credits + purchase), profile, settings. (`src/app/(dashboard)/contractor/`)
- **Admin (auth, role `admin`):** `/admin` — leads, contractors (verify), members, storm-events, plans/credits, analytics, settings. (`src/app/(dashboard)/admin/`)
- **Tokenized (no session needed):** quote acceptance link, review submission link, invitation accept link.
- **API route handlers:** `/api/inngest`, `/api/push/*`, `/api/webhooks/stripe`, `/api/webhooks/twilio` (inbound SMS), `/api/webhooks/resend` (inbound email).

---

## 14. Environment Variables

```
# Supabase + DB
NEXT_PUBLIC_SUPABASE_URL  NEXT_PUBLIC_SUPABASE_ANON_KEY  SUPABASE_SERVICE_ROLE_KEY  DATABASE_URL

# Inngest
INNGEST_SIGNING_KEY  INNGEST_EVENT_KEY   (+ INNGEST_DEV=1 locally)

# Stripe (subscriptions + one-time credit purchases)
STRIPE_SECRET_KEY  STRIPE_WEBHOOK_SECRET  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Twilio (SMS) — either a single from-number or a Messaging Service SID
TWILIO_ACCOUNT_SID  TWILIO_AUTH_TOKEN  TWILIO_PHONE_NUMBER  (or TWILIO_MESSAGING_SERVICE_SID)

# Email (Resend)
RESEND_API_KEY  NEXT_PUBLIC_FROM_EMAIL

# Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY  VAPID_PRIVATE_KEY  VAPID_SUBJECT

# Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET  CLOUDINARY_API_KEY  CLOUDINARY_API_SECRET

# App
NEXT_PUBLIC_SITE_URL
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

Live status — what's shipped, what's next, and the decision log — lives in the
running tracker: **`docs/ROADMAP.md`**. In short: the v2 foundation and the full
lead loop (offer → engage → quote → accept → complete → review), unified job
boards, universal messaging, and notifications are **built**; what's next and why
is tracked in the roadmap.

**Test fixtures:** `pnpm test:reset` (wipe activity) + `pnpm test:seed` (one job per
scenario across both dashboards) — see `scripts/test-*.ts`.
