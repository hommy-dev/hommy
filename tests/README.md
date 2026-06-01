# RoofLink test suite

Three layers, each with its own job. See `business-scope-launch-sharded-lake.md`
for the full rationale.

## Quick start

```sh
# 1. Spin up the test DB (Docker required)
pnpm test:db:up

# 2. Run unit tests (no DB needed, fast)
pnpm test:unit

# 3. Run integration tests (DB required)
pnpm test:integration

# 4. Run the whole vitest suite
pnpm test

# 5. Run E2E (requires `next dev` running, or playwright will start it)
pnpm test:e2e

# 6. Tear down the test DB
pnpm test:db:down
```

## Layout

- `tests/unit/` — pure-function tests. jsdom env, no DB, no network. Fast.
- `tests/integration/` — server actions + Inngest functions. node env, real
  Postgres on `localhost:54322`. Each test runs against a freshly-truncated DB.
- `tests/e2e/` — Playwright. Real browser, real Next.js dev server.
- `tests/fixtures/` — seed factories (`makeContractor`, `makeProject`, …).
- `tests/helpers/` — test utilities (auth mock, AI mock, time fast-forward,
  Inngest event capture, system-message reader).

## Conventions

- One test file per source file or per domain. Co-locate is fine for unit
  tests on pure functions; integration tests should mirror the action file
  they cover (e.g., `tests/integration/quotes.test.ts` covers
  `src/lib/actions/quotes.ts`).
- Always assert **post-condition state**, not just "function returned." For
  state-machine tests this means: which row(s) changed, what status, what
  system messages were written, what Inngest events were sent.
- Don't add tests for the framework. Drizzle's `db.insert` is not yours to
  test. Zod validation works. Test *your* logic.
- AI calls must be mocked. See `tests/helpers/ai.ts`.
- Time-based assertions use `vi.useFakeTimers()`; see `tests/helpers/time.ts`.

## What is **not** scripted (manual only)

- AI conversation quality (Gemini phrasing, intake feel)
- Real Stripe charge/payout
- Realtime UX timing on contractor-status broadcasts
- Mobile layout / Lighthouse perf
- Push/email/SMS deliverability (we assert the call was made; delivery is manual)
