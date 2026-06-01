# Homei — Product & Technical Brief
> This document is the single source of truth for building the Homei platform. Read every section before writing any code.

---

## 0. Platform Vision & Naming — READ THIS FIRST

**Homei is a multi-vertical home-services platform — NOT a roofing app.** Roofing is **launch vertical #1**. Once it proves out, we add more home services on the same core (e.g. deep cleaning, ceiling/drywall, gutters, and other home-related trades). Every agent must build with that future in mind, even while only roofing ships now.

**Scope rule:** Build **only roofing** right now. Do not build other verticals — but never design anything in a way that would block adding them later.

**Naming rules (non-negotiable):**
- The brand/platform name is **Homei**. Never name the platform, or anything core, after roofing.
- **No `roof`/`roofing` in core names** — not table names, column names, enum values that are meant to be shared, route segments, server-action files, function names, or component names. Use service-neutral vocabulary: `services`, `leads`, `contacts`, `projects`, `estimates`, `service_areas`, `reviews`.
- Roofing-specific vocabulary is allowed only inside clearly roofing-scoped places (a roofing `service_details` payload, a roofing seed row, a fenced roofing-only module/route).

**Schema rules (multi-vertical from day one):**
- A **`services`** table (the verticals) is the backbone. Roofing is just a seed row. `leads`, `projects`, and the contractor's offered-services join all reference a **`service_id`** — never a hardcoded roofing `job_type` enum.
- **Service-specific intake/estimate fields live in a flexible `service_details` (jsonb)** on `leads` and `estimates` — so roofing's `roof_size_sqft` and shingle/material choices never become columns on the core tables. Each service defines its own `service_details` shape (validated in app code per service). Cleaning, gutters, etc. will have entirely different fields.
- **Roofing-only features are isolated, optional modules.** Storm/weather alerts only make sense for roofing — so `storm_events` and `leads.storm_event_id` are roofing-scoped, nullable, and fenced off, not part of the core lead lifecycle.
- **Shared enums stay service-neutral:** urgency, pipeline `stage`, lead `status`, message `channel`, notification `type` — these apply to every vertical, so keep them generic.
- Pricing/subscription (plan → included leads) is platform-level and service-neutral.

> Practical example: "what do you need?" on the homepage is `service_id` (Roofing) + a roofing-defined subtype in `service_details` (Repair / Replacement / Inspection / Storm Damage). When cleaning launches, it's a new `services` row with its own subtypes in `service_details` — zero schema migration.

---

## 0.1 Build Decisions — reconciled with the codebase (2026-06)

> This brief began as a draft. The points below reconcile it with the actual project (a cleaned, rebranded Next.js 16 codebase) and with current-as-of-2026 API research. Where this section conflicts with later sections, **this section wins** — the later text has been updated to match but read this first.

- **Framework:** Next.js **16** App Router (the draft said 15). `cacheComponents: true` is on — use the `"use cache"` directive, never `unstable_cache`. `proxy.ts` replaces `middleware.ts`. `params`/`searchParams` are always Promises. See `CODING_GUIDE.md`.
- **Project layout:** `src/` based — `src/app`, `src/lib`, `src/components`; Inngest functions live in `src/lib/inngest/functions/` (the draft's root `/app`, `/inngest` layout in §13 is superseded by §13's updated version).
- **File storage:** **Cloudinary** (already wired: `src/lib/cloudinary/*`, `next-cloudinary`, `CLOUDINARY_*` env). The draft said Supabase Storage — we use Cloudinary instead.
- **Maps / address autocomplete:** **Google Places (New)** via the `PlaceAutocompleteElement` web component (we have a Google Maps JS key + `@googlemaps/js-api-loader`). The deprecated `Autocomplete` widget is closed to new projects. Mapbox is **not** used — ignore `NEXT_PUBLIC_MAPBOX_TOKEN` in the draft.
- **Weather:** **NOAA / NWS `api.weather.gov`** — free, US-only, official, returns hail-size/wind-gust fields. Poll `GET /alerts/active?point={lat},{lon}` per service-area centroid on a cron (needs a `User-Agent` header, coords to 4 decimals, **no API key**). Open-Meteo `wind_gusts_10m_max` is an optional historical-wind supplement. The draft's `WEATHER_API_KEY` is not needed for NWS.
- **Roof measurement:** **manual entry** (sq ft / squares) for the MVP. API auto-measurement (EagleView Developer API) is a later enhancement — the `estimates` table carries a `measurement_source` enum so it can be backfilled without a migration.
- **Estimate acceptance / e-sign:** **tokenized "Accept this estimate" link** recorded in the DB (acceptance timestamp + IP + user-agent + quote snapshot). This satisfies ESIGN/UETA intent for a quote. DocuSeal is a later upgrade only if true signature artifacts are needed.
- **Homeowners are unauthenticated (important).** They never create accounts. All homeowner communication is **SMS (Twilio) + email (Resend)**, and they act through **tokenized links** (estimate acceptance, review submission). The contractor "Messages" inbox (§6.2) is the contractor's view of those SMS/email threads — not an in-app two-account chat. Build it on the existing realtime/chat UI components, but the counterparty is a phone number/email, not a logged-in user.
- **Payments:** **Stripe subscriptions only** (Checkout Session for signup → Billing Customer Portal for self-serve → webhook route handler for state sync, raw body via `request.text()` on the Node runtime). No Stripe Connect, no escrow, no money moving between homeowner and contractor.
- **Routes:** public/homeowner & marketing at `/`, `/get-a-quote`, `/thank-you`, `/contractors`, `/contractors/signup`, `/roofing-contractors/[city]-[state]`, `/review/[token]`; the authenticated contractor CRM lives under **`/dashboard`**; admin under `/admin`.
- **Auth/roles:** Supabase Auth. `users.role` is `contractor` or `admin` only (no homeowner role). `getRequiredUser()` in `src/lib/auth/session.ts`.

---

## 1. What We Are Building

A two-sided **home-services** platform connecting homeowners who need work done with local service contractors. **It launches with roofing as the first vertical** (so all current copy, flows, and seed data are roofing), but the architecture is multi-vertical — see §0. The platform has two jobs:

1. **Generate and deliver exclusive, high-intent leads to contractors** (homeowner side)
2. **Give contractors a purpose-built CRM and toolset to close those leads** (contractor side)

We are not a transaction layer. We do not process payments between homeowner and contractor. We are a lead generation platform with CRM tools on top. This distinction matters for product decisions throughout.

The business model is a monthly contractor subscription that includes a set number of exclusive leads plus CRM access.

---

## 2. Core Problems We Are Solving

These are real pain points this platform directly addresses. The stats below are the *defensible*, sourced versions (the original draft figures were fact-checked — some were folklore; cite the primary studies, not vendor blogs):

- **Shared leads from Angi/HomeAdvisor are garbage.** A shared lead is sold simultaneously to **3–5 contractors**, and premium roofing leads run **$100+ each** — pushing realistic cost-per-acquisition into the **$600–$1,200** range at a 10–15% close rate. We provide exclusive leads only. *(Jobber; LeadTruffle 2026)*
- **Speed to lead wins the job.** Responding within **5 minutes** vs. 30 makes a lead ~**21× more likely** to qualify (Lead Response Management / MIT study). Yet measured average first-response times are dismal — the canonical HBR/Oldroyd study found an **~42-hour average** first response, and home-service businesses miss **~27% of inbound calls**. We send instant push + SMS the moment a lead arrives. *(HBR 2011; LeadResponseManagement.org)*
- **Closing takes persistence most contractors don't have.** **80% of sales require 5+ follow-ups**, but **~44% of reps quit after one** and only ~8% make five or more. We automate the follow-up sequence. *(IRC Sales Solutions; SPOTIO)*
- **Most small roofers have no real CRM workflow.** They run on spreadsheets, sticky notes, and group texts; CRM *daily usage* in the trades is low even where software exists. We give them a simple, mobile-first tool built for how they actually work. *(Qualitative — roofing-software industry sources; avoid quoting a hard "%," none is reliably sourced.)*
- **Storm events create lead overflow with no system to handle it.** We poll NOAA/NWS severe-weather alerts by service-area and push storm-triggered leads automatically.

> Marketing-page note: also strong and well-sourced — "**~91% of homeowners read online reviews before choosing a contractor**" (ACHR News 2024) and "**85% of callers who reach voicemail won't call back; ~67% immediately call a competitor**" (2024). Use the 5-minute rule and missed-call stats as hero numbers; avoid the unverifiable "72% no CRM" figure from the draft.

---

## 3. Tech Stack

Use this stack exactly. Do not deviate or suggest alternatives unless something is genuinely impossible. (Reconciled with the installed codebase — see §0.)

- **Framework:** Next.js **16** App Router (Pages Router not used) — `cacheComponents: true`, `proxy.ts` (not middleware), async `params`/`searchParams`/`cookies`/`headers`
- **Database:** Supabase (Postgres)
- **ORM:** Drizzle ORM (`postgres-js` driver, Supavisor pooler — `prepare: false`)
- **Auth:** Supabase Auth (`@supabase/ssr`)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Background Jobs / Queues:** Inngest (`src/lib/inngest`)
- **File Storage:** **Cloudinary** (`src/lib/cloudinary/*`, `next-cloudinary`)
- **Payments:** Stripe (subscriptions only — Checkout + Customer Portal + webhooks; no Connect, we are not moving money between homeowner and contractor)
- **SMS / Notifications:** Twilio
- **Email:** Resend
- **Push Notifications:** Web Push API (VAPID; `web-push`, service worker at `public/sw.js`)
- **Maps / Geocoding:** Google Places (New) — `PlaceAutocompleteElement`, `@googlemaps/js-api-loader`
- **Weather Data:** NOAA / NWS `api.weather.gov` (free, US, no key; severe alerts by lat/lng). Optional: Open-Meteo for historical wind.
- **Language:** TypeScript throughout (strict mode)

---

## 4. User Roles

### Homeowner (unauthenticated)
- Visits public-facing pages
- Submits a lead request form
- Receives confirmation SMS and email
- Does not need an account

### Contractor (authenticated)
- Has a full account with subscription
- Accesses the full CRM dashboard
- Receives leads, manages pipeline, sends estimates, communicates with homeowners

### Admin (internal)
- Manages the platform
- Views all leads, contractors, analytics
- Manually triggers storm alerts if needed
- Manages billing and subscriptions

---

## 5. Platform Structure

The platform has three distinct sides:

1. **Public / Homeowner side** — marketing pages + lead intake
2. **Contractor dashboard** — authenticated CRM app
3. **Admin panel** — internal operations

---

## 6. All Pages — Detailed Spec

---

### 6.1 Public Pages (Homeowner Side)

---

#### `/` — Homepage

**Purpose:** Convert visitors into lead submissions.

**Must have:**
- Hero section with headline, subheadline, and lead intake form above the fold
- The form is the primary CTA — not a button that links somewhere else, the actual form
- Social proof section: number of jobs completed, average response time, star rating
- How It Works section: 3 steps (Submit, Get Matched, Get Your Roof Fixed)
- Trust signals: licensed contractors, insured, no obligation
- Footer with links to contractor sign-up, about, privacy, terms

**Form fields (keep short):**
- What do you need? (dropdown: Repair / Full Replacement / Inspection / Storm Damage)
- Your address (autocomplete using Google Places — `PlaceAutocompleteElement`)
- How urgent? (dropdown: Emergency / Within a week / Within a month / Just planning)
- Full name
- Phone number
- Email
- Optional: Upload a photo of the damage (single image, Cloudinary)

**On submit:** Do not redirect immediately. Show inline loading state, then transition to confirmation state on the same page showing "We're matching you now."

---

#### `/get-a-quote` — Standalone Quote Form

**Purpose:** Dedicated page for ad traffic and direct links. Same form as homepage but full-page focus, no nav distractions. Minimal layout, just the form and trust badges.

---

#### `/thank-you` — Post-Submission Confirmation

**Purpose:** Confirm the submission and set homeowner expectations.

**Must show:**
- "Your request is confirmed" headline
- "A local roofing contractor will contact you within 60 minutes"
- Summary of what they submitted (job type, address)
- What happens next: 3 step explainer
- "While you wait" section with useful content (what to document for insurance, etc.)

**Triggered automatically:**
- SMS to homeowner: "Hi [Name], your roofing request was received. A local contractor will call you within 60 minutes. — Homei"
- Email confirmation with job summary

---

#### `/contractors` — Contractor Landing Page

**Purpose:** Recruit contractors to sign up. This is a marketing page.

**Must have:**
- Value prop headline focused on exclusive leads
- Pain point section calling out Angi/HomeAdvisor shared lead problem
- Feature highlights: exclusive leads, instant alerts, built-in CRM, storm notifications
- Pricing section (see Section 8 for plans)
- Testimonials placeholder
- CTA to `/contractors/signup`

---

#### `/contractors/signup` — Contractor Registration

Multi-step onboarding form. Do not put everything on one page.

**Step 1 — Account**
- Full name
- Email
- Password
- Company name
- Phone number

**Step 2 — Business Details**
- Years in business
- License number (text input)
- Insurance provider + policy number
- Upload: License document (PDF or image)
- Upload: Insurance certificate (PDF or image)

**Step 3 — Service Area**
- Zip code input with add/remove tags
- Or draw on a map (map picker using Google Maps)
- Job types they handle (multi-select: Repair, Replacement, Inspection, Storm Damage, Commercial)

**Step 4 — Choose Plan**
- Show pricing cards (see Section 8)
- Connect Stripe for billing
- Free trial option if applicable

**After signup:** Redirect to `/dashboard` with a welcome banner. Account status is "Pending Verification" until admin approves license/insurance docs.

---

#### `/roofing-contractors/[city]-[state]` — SEO Location Pages

**Purpose:** Capture organic search traffic for "roofing contractors in [city]" queries.

**Each page shows:**
- H1: "Roofing Contractors in [City], [State]"
- Short intro paragraph with city name
- Lead intake form (same as homepage)
- List of verified contractors in that area (name, rating, jobs completed — no contact info exposed)
- FAQ section with local-specific content

Generate these pages dynamically from a cities table in the database. Seed with top 50 US cities initially.

---

### 6.2 Contractor Dashboard (Authenticated)

All routes under `/dashboard`. Require auth (role = `contractor`). Redirect to `/auth/login` if not authenticated.

The dashboard uses a persistent three-column layout on desktop:
- **Left:** Fixed sidebar navigation (always visible)
- **Middle:** Page content / list views
- **Right:** Detail panel (slides in when an item is selected, pushed layout does not overlay)

On mobile: bottom tab navigation for the 5 main sections. Detail views go full screen.

---

#### `/dashboard` — Home / Command Center

**Purpose:** The first screen a contractor sees. Tells them exactly what needs attention right now.

**Sections:**

**Today's Priority Queue**
- New leads received in last 24 hours with a red "NEW" badge
- Follow-ups due today (pulled from active projects)
- Storm alert banner if a weather event was detected in their service area

**Pipeline Snapshot**
- Count of leads in each stage: New, Contacted, Estimate Sent, In Progress, Won, Lost
- Click any stage to go to Projects filtered by that stage

**Messages Preview**
- Last 3 unread conversations with a reply button
- "View all messages" link

**This Month**
- Revenue closed (sum of won project estimates)
- Leads received
- Leads closed
- Response rate

**Quick Actions**
- "Add manual lead" button (for leads that came in via phone call)
- "View storm alerts" button

---

#### `/dashboard/leads` — Leads Inbox

**Purpose:** Triage new, incoming, uncontacted leads fast. This page is about urgency and speed.

**Definition:** A lead appears here only when it is new and uncontacted. Once the contractor marks it as contacted or moves it to a pipeline stage, it moves to Projects. Leads do not live here forever.

**Layout:**
- List of leads sorted by urgency (storm-triggered first, then emergency, then recency)
- Each lead card shows: homeowner name, address, job type, time received, urgency badge, a "Call Now" button
- Tap "Call Now" triggers a phone call (tel: link on mobile) AND logs the contact attempt in the system AND starts a 30-minute timer before the lead can be reassigned
- Filter bar: All / Storm / Emergency / Today / Unresponded

**Lead card states:**
- **New (red border):** Not yet acted on
- **Attempting (yellow border):** Contractor clicked Call Now but no response logged
- **Expiring soon (pulsing red badge):** Contractor has not responded in 25 minutes, warning shown

**Empty state:** "No new leads right now. We'll notify you the moment one arrives." with a link to adjust service area.

---

#### `/dashboard/contacts` — Contacts

**Purpose:** Long-term homeowner relationship management. Every homeowner the contractor has ever interacted with lives here.

**A contact is created automatically when:**
- A lead is claimed by the contractor
- A contractor manually adds a contact

**List view shows:** Name, address, last contact date, number of projects, total estimated value, tags (repeat customer, referral, etc.)

**Search and filters:** By name, zip code, job type, last activity date, tag

**Contact detail (right panel or full page on mobile):**
- Full homeowner info (name, phone, email, address)
- Tags (editable)
- Notes (free text, auto-saved)
- Projects linked to this contact (list with status and value)
- Full message history across all projects

**Important:** A contact can have multiple projects over time. This is the long-term view of a homeowner relationship. Do not confuse with a single job.

---

#### `/dashboard/projects` — Projects Pipeline

**Purpose:** Manage all active and past jobs from estimate to completion.

**A project is created automatically when a lead moves out of the leads inbox** (when contractor marks first contact made). It can also be created manually.

**Pipeline stages:** New Lead → Contacted → Estimate Sent → In Progress → Completed → Lost

**Views:**
- Kanban board (default on desktop): columns for each stage, cards draggable between stages
- List view (toggle): all projects in a table with sortable columns
- Filter by: stage, job type, date range, value range

**Project card shows:** Contact name, address, job type, stage, estimate value if set, days in current stage, next follow-up date

**Project detail page (`/dashboard/projects/[id]`):**

This is the most important page in the CRM. Everything about one job lives here.

Sections:
1. **Header:** Contact name, address, job type, current stage selector (change stage inline), assigned labels
2. **Timeline:** Auto-generated activity log. System writes: "Lead received 2:34pm", "First call attempt 2:41pm", "Estimate sent 3:15pm". Contractor can also add manual notes to the timeline.
3. **Estimate Builder:** (see Section 6.2 Estimate Builder below)
4. **Documents:** Upload and store any files related to this job. Photos of damage, signed contracts, insurance docs.
5. **Communication:** Embedded message thread for this specific project. Shows all SMS, email, and in-platform messages with this homeowner in one chronological feed. Compose from here. Sends as SMS by default, email as fallback.
6. **Follow-up Scheduler:** Set a follow-up date and time. Platform sends a reminder notification when it's due. Pre-written follow-up message templates available.
7. **Linked Contact:** Card showing the homeowner's full contact info with a link to their contact record.

**Automation on stage changes:**
- Moved to "Estimate Sent": Schedule follow-up reminder for 48 hours
- Moved to "In Progress": Send homeowner a confirmation message template
- Moved to "Completed": Trigger review request to homeowner after 3 days
- Stayed in same stage for 7+ days: Flag with "Stale" badge on pipeline card

---

#### Estimate Builder (inside Project detail)

**Not a separate page.** Lives as a section inside the project detail.

**Fields:**
- Roof size (sq ft) — **manual entry for MVP** (contractor types sq ft / squares). API auto-measurement (EagleView Developer API) is a later enhancement; store a `measurement_source` enum (`manual` | `eagleview`) so it can be added without a migration.
- Job type (repair / replacement / inspection)
- Materials (dropdown: Asphalt Shingle / Metal / Tile / TPO / Other)
- Labor cost
- Materials cost
- Additional line items (add/remove rows)
- Tax rate
- Notes / scope of work (text area)
- Validity period (default: 30 days)

**Output:**
- Auto-calculates subtotal, tax, total
- Generates a clean PDF proposal branded with contractor's company name and logo
- Send button: delivers PDF via SMS link + email to homeowner with a **tokenized "Accept this estimate" link** (MVP). Acceptance records timestamp + IP + user-agent + a snapshot of the quote total/version on the `estimates` row — ESIGN/UETA-sufficient for a quote. (DocuSeal is a later upgrade only if true signature artifacts are required.)
- When homeowner accepts: project auto-moves to "In Progress" stage and contractor gets a push notification

---

#### `/dashboard/messages` — Messages Inbox

**Purpose:** A unified communication inbox. All conversations across all leads, contacts, and projects in one place. This is the speed layer for communication.

**This page is always accessible from the sidebar. It is a fixed, permanent section.**

**Layout (three panes):**
- Left pane: List of all conversations sorted by most recent activity. Shows homeowner name, last message preview, unread count badge, timestamp. Unread conversations have a bold treatment.
- Middle pane: Full conversation thread for selected conversation. Chronological messages (SMS, email, in-platform). Compose box at bottom.
- Right pane: Context panel showing which contact and project this conversation is tied to. Quick actions: call homeowner, view project, move pipeline stage, send estimate.

**Filters on conversation list:** All / Unread / Leads / Active Projects / Completed

**Sending a message:**
- Type in compose box
- Select channel: SMS (default) / Email
- Hit send
- Message logged in both the messages inbox AND the project detail communication section

**Key rule:** The messages inbox and the project communication section show the same data. They are two views into the same message records, not two separate systems. Writing here appears there and vice versa.

---

#### `/dashboard/storm-alerts` — Storm Alerts

**Purpose:** Show contractors active weather events in their service area and surface leads generated from those events.

**How it works:**
- Platform polls weather API for hail, high wind, and storm events by zip code nightly (Inngest cron job)
- When an event is detected in a zip code matching a contractor's service area, they get a push notification + SMS
- Event appears on this page with a map showing affected zip codes
- Leads submitted from those zip codes during or after the event are tagged "Storm Lead" and appear here

**Page layout:**
- Active alerts banner (if any) at top
- Map showing affected areas overlaid on their service territory
- Storm leads list: filtered list of all leads tagged with this storm event
- Past events section: history of previous storm events and leads generated

---

#### `/dashboard/reviews` — Reviews & Reputation

**Purpose:** Aggregate reviews from completed jobs.

**How reviews are collected:**
- After a project is marked Completed and 3 days pass, Inngest triggers a review request SMS to the homeowner
- Homeowner clicks a link, lands on a simple review page (`/review/[token]`), submits 1-5 stars + comment
- Review appears on contractor's profile and this page

**Page shows:**
- Overall rating and total review count
- Individual reviews with homeowner first name, date, rating, comment
- Link to their public contractor profile

---

#### `/dashboard/profile` — Contractor Public Profile

**Purpose:** The page homeowners see when browsing contractors. Builds trust.

**Editable fields:**
- Company name and logo upload
- Bio / about section
- Service area (linked to service area settings)
- License number (display only)
- Years in business
- Photo gallery (upload up to 10 job photos)

**Auto-populated:**
- Star rating and review count
- Verified badge (once admin approves license/insurance)
- Jobs completed count
- Response time average

---

#### `/dashboard/settings` — Settings

Sub-sections:

**Account:** Edit personal info, change password, upload profile photo

**Company:** Edit company name, logo, bio, license info

**Service Area:** Map-based zip code selector. Add/remove zip codes. Radius tool option.

**Notifications:**
- New lead: Push / SMS / Email (all on by default)
- Follow-up due: Push / SMS
- Storm alert: Push / SMS
- New message: Push
- Quiet hours: Set a time range where only emergency leads break through

**Subscription & Billing:**
- Current plan name and lead count remaining this month
- Upgrade/downgrade options
- Invoice history (link to Stripe customer portal)
- Cancel subscription option

---

### 6.3 Admin Panel

All routes under `/admin`. Separate auth role check. Do not use the same layout as contractor dashboard.

---

#### `/admin` — Admin Dashboard

Overview stats: Total contractors (active/pending), leads today, leads this month, platform revenue, average response time across all contractors, storm events active.

---

#### `/admin/leads` — Lead Management

All leads across the platform. Table view with filters by status (claimed/unclaimed/expired), date, zip code, job type. See which leads went unclaimed and how long they sat.

---

#### `/admin/contractors` — Contractor Management

All contractors. Filter by: verification status (pending/verified/rejected), plan tier, active/inactive. Click a contractor to see their full profile, lead history, review score, subscription status.

**Actions per contractor:** Verify (approve license/insurance), Reject with reason, Suspend, Reset lead count, Manually assign a lead.

---

#### `/admin/storm-events` — Storm Event Monitor

Map view of active and past storm events. Shows which events triggered alerts, how many contractors were notified, how many leads were generated. Manual trigger option to push a storm alert to specific zip codes.

---

#### `/admin/analytics` — Analytics

Platform-wide metrics:
- Lead volume by week/month with chart
- Average contractor response time trend
- Lead-to-close rate by contractor
- Revenue by plan tier
- Churn rate
- Top performing contractors
- Geographic heat map of lead density

---

#### `/admin/settings` — Platform Settings

- Lead expiry time (default: 30 minutes before reassignment)
- Max leads per contractor per plan tier
- Review request delay (default: 3 days after completion)
- Stripe webhook configuration
- Twilio / Resend API config

---

## 7. Database Schema (Drizzle ORM)

```typescript
// users — Supabase Auth handles passwords, this extends the auth.users table
users {
  id: uuid (FK to auth.users)
  email: text
  full_name: text
  phone: text
  role: enum('contractor', 'admin')
  created_at: timestamp
}

// services — the verticals. Roofing is launch vertical #1 (a seed row).
// Adding a new home service later is a new row here — NOT a schema migration.
services {
  id: uuid
  slug: text (unique)          // 'roofing', later 'cleaning', 'gutters', ...
  name: text                   // 'Roofing'
  is_active: boolean           // gate which verticals are live
  subtypes: jsonb              // service-defined options, e.g. roofing:
                               //   ['repair','replacement','inspection','storm_damage']
  created_at: timestamp
}

// contractors — One per contractor user
contractors {
  id: uuid
  user_id: uuid (FK users)
  company_name: text
  bio: text
  logo_url: text
  license_number: text
  license_doc_url: text
  insurance_provider: text
  insurance_policy: text
  insurance_doc_url: text
  years_in_business: integer
  verification_status: enum('pending', 'verified', 'rejected')
  stripe_customer_id: text
  stripe_subscription_id: text
  plan: enum('starter', 'growth', 'pro')
  leads_used_this_month: integer
  avg_response_time_minutes: integer
  avg_rating: decimal
  total_reviews: integer
  created_at: timestamp
}

// service_areas — Many zip codes per contractor
service_areas {
  id: uuid
  contractor_id: uuid (FK contractors)
  zip_code: text
  lat: decimal (nullable)   // zip centroid — used to poll NWS /alerts/active?point=lat,lon
  lng: decimal (nullable)
  created_at: timestamp
}

// contractor_services — which verticals (+ subtypes) a contractor handles.
// Replaces the roofing-only job_type enum. Service-neutral.
contractor_services {
  contractor_id: uuid (FK contractors)
  service_id: uuid (FK services)
  subtypes: text[]             // service-scoped, e.g. roofing: ['repair','replacement','inspection','storm_damage','commercial']
  // primary key (contractor_id, service_id)
}

// homeowners — Created when a lead is submitted
homeowners {
  id: uuid
  full_name: text
  email: text
  phone: text
  address: text
  zip_code: text
  city: text
  state: text
  lat: decimal
  lng: decimal
  created_at: timestamp
}

// leads — The raw incoming request
leads {
  id: uuid
  homeowner_id: uuid (FK homeowners)
  service_id: uuid (FK services)          // which vertical (Roofing for now)
  service_details: jsonb                  // vertical-specific intake, e.g. roofing:
                                          //   { subtype: 'storm_damage' }
  urgency: enum('emergency', 'within_week', 'within_month', 'planning')   // shared across verticals
  photo_url: text
  notes: text
  storm_event_id: uuid (nullable FK storm_events)   // ROOFING-ONLY module — null for other verticals
  status: enum('pending', 'assigned', 'expired')
  assigned_to: uuid (nullable FK contractors)
  assigned_at: timestamp
  expires_at: timestamp
  created_at: timestamp
}

// contacts — Created from lead when contractor claims it
contacts {
  id: uuid
  contractor_id: uuid (FK contractors)
  homeowner_id: uuid (FK homeowners)
  tags: text[]
  notes: text
  created_at: timestamp
}

// projects — Created when lead moves to active pipeline
projects {
  id: uuid
  contractor_id: uuid (FK contractors)
  contact_id: uuid (FK contacts)
  lead_id: uuid (nullable FK leads)
  service_id: uuid (FK services)          // inherited from the lead's vertical
  stage: enum('new_lead', 'contacted', 'estimate_sent', 'in_progress', 'completed', 'lost')   // shared across verticals
  estimate_value: decimal
  notes: text
  follow_up_at: timestamp
  stage_updated_at: timestamp
  created_at: timestamp
}

// estimates
estimates {
  id: uuid
  project_id: uuid (FK projects)
  service_details: jsonb   // vertical-specific fields, e.g. roofing:
                           //   { roof_size_sqft, measurement_source: 'manual'|'eagleview',
                           //     materials: 'asphalt_shingle'|'metal'|'tile'|'tpo'|'other' }
  labor_cost: decimal
  materials_cost: decimal
  line_items: jsonb
  tax_rate: decimal
  subtotal: decimal
  tax_amount: decimal
  total: decimal
  scope_notes: text
  valid_until: timestamp
  pdf_url: text
  status: enum('draft', 'sent', 'accepted', 'rejected')
  accept_token: text (unique, nullable)  // tokenized homeowner "Accept this estimate" link
  accepted_at: timestamp
  accepted_ip: text (nullable)           // ESIGN/UETA acceptance audit
  accepted_user_agent: text (nullable)
  accepted_snapshot: jsonb (nullable)    // frozen total/version at moment of acceptance
  sent_at: timestamp
  created_at: timestamp
}

// messages — Unified message store. The homeowner has NO account: outbound
// messages go out as SMS (Twilio) / email (Resend); inbound messages arrive via
// Twilio/Resend inbound webhooks and are matched back to a contact by phone/email.
// The contractor's "Messages" inbox is their view of these threads. 'platform' =
// internal/system entries (e.g. logged calls, automated notes), not homeowner chat.
messages {
  id: uuid
  project_id: uuid (nullable FK projects)
  contact_id: uuid (FK contacts)
  contractor_id: uuid (FK contractors)
  direction: enum('outbound', 'inbound')
  channel: enum('sms', 'email', 'platform')
  body: text
  read: boolean
  external_id: text (Twilio SID or email ID)
  created_at: timestamp
}

// activity_log — Auto-generated timeline for projects
activity_log {
  id: uuid
  project_id: uuid (FK projects)
  actor: enum('system', 'contractor', 'homeowner')
  action: text
  metadata: jsonb
  created_at: timestamp
}

// reviews
reviews {
  id: uuid
  project_id: uuid (FK projects)
  contractor_id: uuid (FK contractors)
  homeowner_id: uuid (FK homeowners)
  rating: integer (1-5)
  comment: text
  token: text (unique, used for review link)
  submitted_at: timestamp
  created_at: timestamp
}

// storm_events
storm_events {
  id: uuid
  event_type: enum('hail', 'high_wind', 'storm')
  severity: text
  affected_zip_codes: text[]
  detected_at: timestamp
  alerts_sent: integer
  leads_generated: integer
  created_at: timestamp
}

// notifications
notifications {
  id: uuid
  contractor_id: uuid (FK contractors)
  type: enum('new_lead', 'follow_up_due', 'storm_alert', 'new_message', 'estimate_accepted', 'review_received')
  title: text
  body: text
  read: boolean
  metadata: jsonb
  created_at: timestamp
}
```

---

## 8. Pricing Plans

| Plan | Monthly Price | Leads Included | Features |
|---|---|---|---|
| Starter | $99/mo | 5 exclusive leads | CRM, instant alerts, basic follow-up |
| Growth | $249/mo | 15 exclusive leads | Everything in Starter + Storm alerts, estimate builder |
| Pro | $499/mo | Unlimited leads | Everything in Growth + Priority matching, analytics, review tools |

Leads refresh monthly. Unused leads do not roll over.

---

## 9. Key Automations (Inngest Jobs)

These are all background jobs. Build with Inngest.

**`lead.assigned`** — Triggered when a lead is assigned to a contractor:
1. Send contractor push notification + SMS with homeowner details
2. Send homeowner SMS: "A contractor has been notified and will call you shortly"
3. Start 30-minute expiry timer (if contractor does not act, reassign to next contractor in area)

**`lead.expiring`** — Triggered 25 minutes after assignment with no contractor action:
1. Send contractor warning notification: "Lead expiring in 5 minutes — respond now"

**`lead.expired`** — Triggered 30 minutes after assignment with no action:
1. Reassign lead to next eligible contractor in the zip code
2. Log reassignment in activity log

**`project.stage_changed`** — Triggered on any pipeline stage change:
1. Log to activity_log
2. If moved to `estimate_sent`: Schedule follow-up reminder for 48 hours
3. If moved to `in_progress`: Send homeowner confirmation SMS
4. If moved to `completed`: Schedule review request for 72 hours later

**`followup.due`** — Triggered when follow_up_at timestamp is reached:
1. Send contractor push notification with project summary
2. Show in dashboard priority queue

**`review.request`** — Triggered 72 hours after project marked completed:
1. Generate unique review token
2. Send homeowner SMS with review link

**`storm.monitor`** — Cron: runs every 6 hours:
1. Query weather API for hail/wind events by zip code
2. Cross-reference with service_areas table
3. For each match, create storm_event record
4. Notify all contractors in affected zip codes
5. Tag any leads submitted from those zips as storm leads

**`leads.monthly_reset`** — Cron: runs on 1st of every month:
1. Reset leads_used_this_month to 0 for all active contractors

---

## 10. Lead Assignment Logic

When a homeowner submits a form:

1. Geocode the address to get zip code and coordinates
2. Query `service_areas` for contractors covering that zip code
3. Filter to contractors who **offer the lead's `service_id`** (`contractor_services`), are `verification_status = 'verified'`, and have `leads_used_this_month < plan_limit`
4. Rank by: plan tier (Pro first), then avg_response_time (fastest first), then random tiebreak
5. Assign to the top-ranked contractor
6. Increment their `leads_used_this_month`
7. If no contractor is available, store lead as `status = 'pending'` and retry every 10 minutes

Lead is exclusive. One contractor per lead. Period.

---

## 11. Real-Time Requirements

Use Supabase Realtime for:
- New message appearing instantly in the messages inbox without refresh
- Lead count badge on the Leads nav item updating when a new lead arrives
- Notification bell count updating in real time
- Pipeline card moving when stage is changed (optimistic UI is fine here)

---

## 12. Notification Architecture

Every contractor notification goes through a single `sendNotification()` function that:
1. Creates a record in the `notifications` table
2. Checks contractor's notification preferences
3. Sends push notification (Web Push)
4. Sends SMS via Twilio if the preference is on
5. Sends email via Resend for non-urgent types

Never call Twilio or Resend directly from page handlers. All outbound comms go through Inngest events.

---

## 13. File Structure

Everything lives under `src/`. Items marked ✅ already exist in the codebase (kept infra); the rest are to be built.

```
src/
  proxy.ts                         # ✅ auth cookie gate (replaces middleware.ts)
  app/
    layout.tsx                     # ✅ root layout
    globals.css                    # ✅
    page.tsx                       # Homepage (lead intake form above the fold)
    get-a-quote/page.tsx
    thank-you/page.tsx
    contractors/page.tsx           # contractor recruitment landing
    contractors/signup/page.tsx    # multi-step contractor onboarding
    roofing-contractors/[slug]/page.tsx   # SEO city pages ([city]-[state])
    review/[token]/page.tsx        # tokenized homeowner review submission
    dashboard/                     # authenticated contractor CRM (role = contractor)
      layout.tsx                   # sidebar shell + getRequiredUser('contractor')
      page.tsx                     # command center
      leads/page.tsx
      contacts/page.tsx
      contacts/[id]/page.tsx
      projects/page.tsx
      projects/[id]/page.tsx       # project detail + estimate builder
      messages/page.tsx
      storm-alerts/page.tsx
      reviews/page.tsx
      profile/page.tsx
      settings/page.tsx
    admin/                         # role = admin (separate layout)
      layout.tsx
      page.tsx
      leads/page.tsx
      contractors/page.tsx
      storm-events/page.tsx
      analytics/page.tsx
      settings/page.tsx
    auth/
      login/page.tsx               # ✅
      callback/route.ts            # ✅ Supabase auth callback
    api/
      inngest/route.ts             # ✅ Inngest serve endpoint
      push/{subscribe,unsubscribe}/route.ts   # ✅ Web Push
      webhooks/stripe/route.ts     # Stripe webhook (raw body, Node runtime)
      webhooks/twilio/route.ts     # inbound SMS
  components/
    ui/                            # ✅ shadcn/ui primitives
    dashboard/                     # ✅ sidebar shell, nav, user menu
    chat/  presence/  realtime/  notifications/   # ✅ reusable comms UI
    public/                        # public/marketing page components (to build)
  lib/
    db/{index.ts ✅, schema.ts}    # Drizzle client ✅ + schema (build per §7)
    supabase/                      # ✅ server/client/admin/middleware
    auth/                          # ✅ getRequiredUser(), session
    inngest/
      client.ts                    # ✅
      functions/                   # one file per automation (§9) — index.ts ✅ (stub)
    notifications/                 # ✅ sendNotification core + sms/email/push transports
    cloudinary/                    # ✅ uploads
    geo/                           # ✅ haversine; add geocoding + zip→latlng helpers
    weather.ts                     # NWS client (to build)
    stripe.ts                      # Stripe client + subscription helpers (to build)
    matching/                      # lead-assignment engine (§10, to build)
```

---

## 14. Environment Variables Needed

Variable names match the keys already present in `.env` where applicable.

```
# Supabase + DB
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL                      # Supavisor pooler URL (port 6543, prepare:false)

# Inngest (prod; INNGEST_DEV=1 locally)
INNGEST_SIGNING_KEY
INNGEST_EVENT_KEY

# Twilio (SMS)
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER

# Resend (email)
RESEND_API_KEY
FROM_EMAIL

# Stripe (subscriptions only)
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_STARTER_PRICE_ID
STRIPE_GROWTH_PRICE_ID
STRIPE_PRO_PRICE_ID

# Google Maps / Places (geocoding + address autocomplete)
NEXT_PUBLIC_GOOGLE_MAPS_KEY

# Cloudinary (file storage)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT

# Weather — NOAA/NWS needs NO API key, only a descriptive User-Agent
NWS_USER_AGENT                    # e.g. "Homei (contact@homei.com)"

NEXT_PUBLIC_APP_URL
```

> The draft listed `NEXT_PUBLIC_MAPBOX_TOKEN` and `WEATHER_API_KEY` — neither is used (Google Places + keyless NWS instead).

---

## 15. What to Build First (MVP Order)

Build in this exact order. Do not build phase 2 until phase 1 is complete and working.

**Phase 1 — Core loop (build this first):**
1. Database schema setup with Drizzle
2. Supabase Auth for contractor login
3. Homepage with lead intake form
4. Thank you page + homeowner SMS confirmation (Twilio)
5. Lead assignment logic
6. Contractor instant notification (push + SMS) on lead arrival
7. `/dashboard/leads` — leads inbox
8. `/dashboard/projects` — basic pipeline (no estimate builder yet)
9. `/dashboard/messages` — messages inbox with SMS send/receive
10. Stripe subscription for contractor signup

**Phase 2 — CRM depth:**
11. Full contact management
12. Project detail page with full timeline and communication section
13. Estimate builder and PDF generation
14. Follow-up automation (Inngest)
15. Contractor public profile

**Phase 3 — Growth features:**
16. Storm alert system (weather API + Inngest cron)
17. Review request automation
18. SEO location pages
19. Admin panel
20. Analytics dashboard

---

## 16. Non-Negotiable Rules

- Mobile-first on all dashboard pages. Contractors are on job sites.
- Every outbound communication (SMS, email, push) goes through Inngest. Never call APIs directly from request handlers.
- Leads are exclusive. Never assign the same lead to two contractors.
- The messages inbox and the project communication section read from the same `messages` table. They are two views of the same data.
- A contact is a person. A project is a job. They are separate records that are linked, not the same thing.
- Do not over-engineer the MVP. If a feature is not in Phase 1, do not build it yet.
- Use TypeScript strict mode throughout.
- All database queries go through Drizzle. No raw SQL except for complex analytics queries.
