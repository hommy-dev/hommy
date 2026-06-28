# Recruitment enrichment worker (Phase 2)

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
- `SCRAPEGRAPH_API_KEY` / `OPENAI_API_KEY` — for the LLM crawl (optional; falls
  back to a basic crawl without it).
- `HUNTER_API_KEY` — domain-search + verifier.
- `MIN_EMAIL_CONFIDENCE` (default 70), `BATCH_SIZE` (default 10),
  `POLL_SECONDS` (default 30), `MAX_ATTEMPTS` (default 3).

## Deploy
Any always-on Python host (Railway/Render/Fly/a small VM/cron). It only needs
outbound HTTPS + the `DATABASE_URL`. Scale by running more instances (SKIP LOCKED
makes that safe).
