# Hommy

A two-sided **home-services** platform: lead generation for homeowners, and a
purpose-built CRM + credit economy for contractors. It **launches with roofing**
as the first vertical, but the core is multi-vertical — more services (cleaning,
gutters, etc.) come later on the same foundation. Read **`docs/HOMMY_PLATFORM.md` §0
first** for the multi-vertical naming/schema rules.

## Getting started

```bash
pnpm install
pnpm dev                 # Next.js dev server (http://localhost:3000)
```

Background jobs (Inngest) run in a separate dev server:

```bash
pnpm dlx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

## Documentation map

Three living docs, each with one job:

```
WHAT we're building  →  docs/HOMMY_PLATFORM.md   (vision, business model, flows, rules — source of truth)
HOW we build it      →  CODING_GUIDE.md          (Next.js 16 patterns, auth, caching, common bugs)
                        AGENTS.md                (project rules + guardrails; CLAUDE.md → AGENTS.md)
WHERE we are / why   →  docs/ROADMAP.md          (status, what's next, and the decision log)
```

Supporting:

```
.impeccable.md            — design context (voice, aesthetic, principles)
docs/launch-campaign.md   — cold-outreach marketing copy
docs/archive/             — superseded early build notes (kept for history only)
tests/README.md           — test setup + fixtures
```

The database schema is **code, not docs** — the source of truth is
`src/lib/db/schema.ts` (`HOMMY_PLATFORM.md` §8 gives the high-level map).

## Useful scripts

```bash
pnpm db:generate         # generate Drizzle migrations from src/lib/db/schema.ts
pnpm db:migrate          # apply migrations (DATABASE_URL = production)
pnpm admin:create        # create an admin user
pnpm test                # unit + integration tests (vitest)
pnpm email:test -- --to=you@example.com   # Resend smoke test
```
