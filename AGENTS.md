<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project-specific rules:
- Homei is a MULTI-VERTICAL home-services platform; roofing is launch vertical #1. Never hard-bind core names to roofing (no `roof`/`roofing` in table/column/route/function names) — use service-neutral names and a `service_id` + `service_details` jsonb. Build only roofing now. See docs/HOMEI_PLATFORM.md §0.
- Stack: Next.js 16, Supabase, Drizzle ORM, Tailwind, shadcn/ui
- Database schema is at src/lib/db/schema.ts
- Server Actions are in src/lib/actions/
- Auth helper is getRequiredUser() in src/lib/auth/session.ts — three roles: `contractor`, `homeowner`, `admin` (see docs/HOMEI_PLATFORM.md §5 identity & §8 schema)
- cacheComponents: true is enabled — use "use cache" directive, NOT unstable_cache
- proxy.ts replaces middleware.ts — never create middleware.ts
- params and searchParams are always Promises — always await them
- Money fields use Decimal strings in DB — parse with parseFloat() for display only
- v2 MODEL (canonical in docs/HOMEI_PLATFORM.md): a contractor is a COMPANY with many member users (users → contractor_members → contractors); homeowners are AUTHENTICATED users with a dashboard; the business model is a CREDIT economy (append-only credit_transactions ledger; plans grant credits; leads are free to receive, small charge to engage, full charge when a quote is accepted); messaging is a universal conversations/participants graph; SMS is Plivo (not Twilio). The code/schema still reflect v1 — migrate toward §8 before building v2 features.

# Documentation (read before building any feature):
- docs/HOMEI_PLATFORM.md — single source of truth: WHAT to build (business rules, every page & flow, all features), the Drizzle schema, file structure, Inngest jobs, lead-assignment logic, pricing, and env vars
- CODING_GUIDE.md — Next.js 16 patterns, auth, caching, common bugs
