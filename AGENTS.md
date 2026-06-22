<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project-specific rules:
- Hommy is a MULTI-VERTICAL home-services platform; roofing is launch vertical #1. Never hard-bind core names to roofing (no `roof`/`roofing` in table/column/route/function names) — use service-neutral names and a `service_id` + `service_details` jsonb. Build only roofing now. See docs/HOMMY_PLATFORM.md §0.
- Stack: Next.js 16, Supabase, Drizzle ORM, Tailwind, shadcn/ui
- Database schema is at src/lib/db/schema.ts
- Server Actions are in src/lib/actions/
- Auth helper is getRequiredUser() in src/lib/auth/session.ts — three roles: `contractor`, `homeowner`, `admin` (see docs/HOMMY_PLATFORM.md §5 identity & §8 schema)
- cacheComponents: true is enabled — use "use cache" directive, NOT unstable_cache
- proxy.ts replaces middleware.ts — never create middleware.ts
- params and searchParams are always Promises — always await them
- Money fields use Decimal strings in DB — parse with parseFloat() for display only
- v2 MODEL (canonical in docs/HOMMY_PLATFORM.md) — now BUILT: a contractor is a COMPANY with many member users (users → contractor_members → contractors); homeowners are AUTHENTICATED users with a dashboard; the business model is a CREDIT economy (append-only credit_transactions ledger; plans grant credits; leads are free to receive, small charge to engage, full charge when a quote is accepted); messaging is a universal conversations/participants graph (rich `messages.meta` cards: quote/event/review; job-workspace conversation uses context_type='project'); SMS is Twilio. The schema is on v2 — match src/lib/db/schema.ts, not older v1 notes.
- LEAD ECONOMY (Phase 1, see §4): leads fan out BROADLY (ranked by score, no engage cap, no lock) and NEVER expire on a contractor — a lead ends only when the homeowner hires/closes it (or a 30-day abandoned-post auto-close). Urgency drives only a fast-responder bonus + a gentle post-engage quote reminder (config in src/lib/config/tunables.ts) — never a deadline/penalty. Scoring is carrots-over-sticks (don't punish honest declines or slow deals). Quotes are accepted INLINE in chat/detail — there is no /homeowner/quotes page; the contractor board is the unified /contractor/jobs.

# Documentation (read before building any feature):
- docs/HOMMY_PLATFORM.md — single source of truth: WHAT to build (business rules, every page & flow, all features), the Drizzle schema, file structure, Inngest jobs, lead-assignment logic, pricing, and env vars
- CODING_GUIDE.md — Next.js 16 patterns, auth, caching, common bugs
