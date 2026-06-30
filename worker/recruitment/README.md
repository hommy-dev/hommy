# Recruitment enrichment worker (Phase 2) — ⚠️ DEPRECATED

> **DEPRECATED (2026-06-30).** Email enrichment now runs in-app, no AI, no Python:
> `src/lib/inngest/functions/prospect-enrich.ts` + `src/lib/recruitment/email-finder.ts`
> (crawl-first website email finder). The GitHub Action schedule for this worker is
> DISABLED — do NOT re-enable it while the Inngest function is live (two writers would
> race on `prospect_enrichment_jobs`). This directory + `.github/workflows/recruitment-worker.yml`
> can be deleted after one verified production cycle on the TS path.

A **standalone** Python service — not part of the Next app. It drains the
`prospect_enrichment_jobs` queue, finds each prospect's email, verifies it, and
writes the result back to `contractor_prospects`. The Next app (Phase 1) does
everything else: discovery (Google Places), prospect storage, export to the
cold-email tool, claim links, and auto-match.

## Why a separate Python service
The only step that needs the Python ecosystem is the website crawl via
**ScrapeGraphAI** (LLM-powered extraction). Keeping it out of the Next app means
no Python in the web deploy, and the worker holds **no business logic** — it
never decides who to email; it only fills `email` + `email_confidence`.

## The waterfall (per job)
1. **ScrapeGraphAI** crawls the prospect's website (home + /contact, /about) and
   extracts a business email. (Falls back to a plain requests+regex crawl if no
   ScrapeGraphAI/LLM key is configured.)
2. **Hunter.io domain-search** fills/strengthens from the domain when the crawl
   finds nothing.
3. **Hunter email-verifier** gates: only a deliverable address above
   `MIN_EMAIL_CONFIDENCE` is kept.
4. Write back: `email` + `email_confidence` + `enrichment_status='email_verified'`,
   or `enrichment_status='no_email'` (skipped forever — there is no SMS fallback).

## Concurrency
Jobs are claimed with `UPDATE ... FOR UPDATE SKIP LOCKED RETURNING`, so many
workers can run without double-claiming.

## Run
```bash
cd worker/recruitment
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL + keys
python worker.py
```

## Env
- `DATABASE_URL` — same Supabase Postgres as the app. Use the **session** port
  (5432) or keep prepared statements off (the app uses the Supavisor pooler on
  6543 with `prepare:false`); psycopg here disables server-side prepares.
- `OPENROUTER_API_KEY` (+ `OPENROUTER_MODEL`, default `openai/gpt-4o-mini`) — the
  LLM for the crawl. OpenRouter is OpenAI-compatible. `OPENAI_API_KEY` /
  `SCRAPEGRAPH_API_KEY` are fallbacks. Without any, a basic requests+regex crawl
  is used (still works, just less robust).
- `HUNTER_API_KEY` — domain-search + verifier (free tier fine at low volume).
- `MIN_EMAIL_CONFIDENCE` (default 70), `BATCH_SIZE` (default 10),
  `POLL_SECONDS` (default 30), `MAX_ATTEMPTS` (default 3).
- `RUN_ONCE` — `true` = drain the queue once and exit (for cron); blank = loop
  forever (for an always-on host).

## Deploy — pick one

### A) Free cron (recommended at low volume) — GitHub Actions
A ready workflow is at `.github/workflows/recruitment-worker.yml`: hourly it
installs deps, runs the worker with `RUN_ONCE=true`, and exits. No server to host.
(Hourly stays within GitHub's free Action minutes on a private repo; bump the cron
on a public repo or when volume grows.)
Add these **repo secrets** (Settings → Secrets and variables → Actions):
`WORKER_DATABASE_URL`, `HUNTER_API_KEY`, `OPENROUTER_API_KEY`. (Scheduled runs
fire only on the default branch and can be a few minutes late on the free tier —
fine for this.)

### B) Always-on host — Railway / Render / Fly / a small VM
Set the env (leave `RUN_ONCE` blank so it loops), run `python worker.py`. Railway
is the easiest (cheap hobby plan). Scale by running more instances — `FOR UPDATE
SKIP LOCKED` makes concurrent workers safe.

It only needs outbound HTTPS + `DATABASE_URL`.
