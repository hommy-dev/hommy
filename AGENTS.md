<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project-specific rules:
- Stack: Next.js 16, Supabase, Drizzle ORM, Tailwind, shadcn/ui
- Database schema is at src/lib/db/schema.ts
- Server Actions are in src/lib/actions/
- Auth helper is getRequiredUser() in src/lib/auth/session.ts — supply-side role is `CONTRACTOR` (table `contractor_profiles`, dashboard `/contractor`)
- cacheComponents: true is enabled — use "use cache" directive, NOT unstable_cache
- proxy.ts replaces middleware.ts — never create middleware.ts
- params and searchParams are always Promises — always await them
- Money fields use Decimal strings in DB — parse with parseFloat() for display only

# Documentation (read before building any feature):
- docs/platform-overview.md — WHAT to build: business rules, flows, every feature behavior
- docs/architecture.md — HOW to build: schema, file structure, code patterns, Stripe, Inngest
- docs/specs/ — deep reference for complex features (intake field schemas, notifications, etc.)
- CODING_GUIDE.md — Next.js 16 patterns, auth, caching, common bugs
