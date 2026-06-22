# Hommy test suite

Three layers, each with its own job: fast pure-function **unit** tests, **integration**
tests that drive the real server actions against a throwaway Postgres, and a thin
**e2e** smoke.

## Quick start

```sh
# 1. Spin up the test DB (Docker Desktop must be running). PostGIS image —
#    lead matching uses a geography column + ST_Covers/ST_Buffer.
pnpm test:db:up

# 2. Unit tests — no DB, no network, fast.
pnpm test:unit

# 3. Integration tests — DB required.
pnpm test:integration

# 4. The whole vitest suite (unit + integration).
pnpm test

# 5. Coverage report (text + html in ./coverage).
pnpm test:coverage

# 6. E2E smoke (Playwright starts the dev server).
pnpm test:e2e

# 7. Tear down the test DB.
pnpm test:db:down
```

`.env.test` points `DATABASE_URL` at `localhost:54322`; integration tests refuse
to run otherwise. It carries **stub** Supabase values only — no real secrets.

## Layout

- `tests/unit/` — pure-function tests. jsdom env, no DB, no network.
  Covered: pricing (`computeAwardCost`/`getLeadPricing`), service-area gate,
  scoring tunables, lead subtype helpers, formatters + score labels.
- `tests/integration/` — server actions + ledger against real Postgres on
  `localhost:54322`. node env, run **serially** (`fileParallelism: false`).
  `tests/setup-integration.ts` installs the Supabase/PostGIS stubs, applies
  migrations once, then TRUNCATEs app tables after each test for a clean slate.
  - `credit-ledger.test.ts` — spend/grant/expire/getBalance money math.
  - `lifecycle.test.ts` — the golden path: engage → quote → accept → complete →
    review, asserting rows + score + Inngest events at each step.
  - `decline.test.ts` — decline scoring + the cascade to the next company.
  - `integrations-data.test.ts` — Google-Places review/media merge + counts.
  - `lead-matching.test.ts` — geographic (radius/polygon) eligibility.
- `tests/e2e/` — Playwright. Real browser, real Next.js dev server.
- `tests/fixtures/` — Drizzle insert factories (`makeContractorWithOwner`,
  `makeHomeowner`, `makeLead`, `makeServiceArea`, …) that return ids.
- `tests/helpers/` — runtime mocks/capture: `auth` (signInAs/signOut + the
  `getRequiredUser` stub), `inngest` (capture `inngest.send`, keep the real
  `INNGEST_EVENTS`), `notifications` (capture email/sms/push senders),
  `next` (no-op `next/cache` + `next/headers`), `realtime` (no-op the
  `sendRealtimeBroadcast` transport).

## Mocking pattern (integration tests)

`vi.mock` is hoisted, so declare mocks at the top of the file, *then* import the
action under test. Mock only the request-scoped runtime; let everything else
(credits, scoring, messaging rows, notifications) run for real and assert it in
the DB.

```ts
vi.mock('@/lib/auth/session', () => mockAuth())
vi.mock('next/cache', () => mockNextCache())
vi.mock('next/headers', () => mockNextHeaders())
vi.mock('@/lib/realtime/broadcast', () => mockRealtimeBroadcast())
vi.mock('@/lib/notifications/email', () => mockEmail()) // Resend ctor throws w/o a key
vi.mock('@/lib/notifications/sms', () => mockSms())
vi.mock('@/lib/notifications/push', () => mockPush())
vi.mock('@/lib/inngest/client', async (importOriginal) => ({
  ...(await importOriginal()),   // keep the real INNGEST_EVENTS
  inngest: capturingInngest,
}))

import { engageLead } from '@/lib/actions/engage'
// ...seed via fixtures, signInAs(user), call the action, assert rows + events.
```

## Conventions

- Always assert **post-condition state**, not just "the function returned ok":
  which rows changed, to what status, which Inngest events fired.
- Don't test the framework. Drizzle inserts and Zod parsing are not yours to test.
- The realtime transport, Resend, Plivo and web-push all funnel through one seam
  each — mock that seam, not every caller.

## What is **not** scripted (manual only)

- The authed-browser golden path (deferred — needs a Supabase session bypass).
- Real payments/payouts.
- Realtime UX timing on broadcasts.
- Mobile layout / Lighthouse perf.
- Push/email/SMS deliverability (we assert the call was made; delivery is manual).
```
