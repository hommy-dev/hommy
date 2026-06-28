"""Recruitment enrichment worker (Phase 2).

Drains `prospect_enrichment_jobs`: for each prospect with a website but no email,
run the waterfall (ScrapeGraphAI crawl -> Hunter domain-search -> Hunter verify)
and write back `email` + `email_confidence` + `enrichment_status`. Companies with
no findable, deliverable email become `no_email` (skipped forever — no SMS).

Standalone service; see README.md. Safe to run multiple instances (SKIP LOCKED).
"""

from __future__ import annotations

import os
import re
import time
import socket
import logging

import requests
import psycopg
from dotenv import load_dotenv

# Load THIS folder's .env regardless of the working directory (missing file is a
# no-op — e.g. on GitHub Actions, where env comes from the workflow instead).
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("recruitment-worker")

DATABASE_URL = os.environ["DATABASE_URL"]
HUNTER_API_KEY = os.environ.get("HUNTER_API_KEY", "")

# LLM for the website crawl. OpenRouter is OpenAI-compatible and is the preferred
# option here; OpenAI and the ScrapeGraphAI managed key are fallbacks. Without any
# of them the worker uses a plain requests+regex crawl.
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
SCRAPEGRAPH_API_KEY = os.environ.get("SCRAPEGRAPH_API_KEY", "")

MIN_CONFIDENCE = int(os.environ.get("MIN_EMAIL_CONFIDENCE", "70"))
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "10"))
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "30"))
MAX_ATTEMPTS = int(os.environ.get("MAX_ATTEMPTS", "3"))
# When true, drain the queue once and exit (for a cron/GitHub Action). Otherwise
# loop forever (for an always-on host).
RUN_ONCE = os.environ.get("RUN_ONCE", "").lower() in ("1", "true", "yes")

WORKER_ID = f"{socket.gethostname()}:{os.getpid()}"
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
# Skip generic/no-reply or asset-looking matches.
BAD_LOCALPARTS = ("noreply", "no-reply", "example", "sentry", "wixpress")


# ── Email finding ────────────────────────────────────────────────────────────

def _llm_config() -> dict | None:
    """LLM config for ScrapeGraphAI. OpenRouter (OpenAI-compatible) preferred.
    The model is the OpenRouter id, e.g. 'openai/gpt-4o-mini' or
    'anthropic/claude-3.5-haiku'. Returns None if no LLM is configured."""
    if OPENROUTER_API_KEY:
        return {
            "api_key": OPENROUTER_API_KEY,
            "model": OPENROUTER_MODEL,
            "base_url": OPENROUTER_BASE_URL,
        }
    if OPENAI_API_KEY:
        return {"api_key": OPENAI_API_KEY, "model": "openai/gpt-4o-mini"}
    if SCRAPEGRAPH_API_KEY:
        return {"api_key": SCRAPEGRAPH_API_KEY, "model": "scrapegraphai/smart"}
    return None


def crawl_email_scrapegraph(url: str) -> str | None:
    """LLM-powered extraction via ScrapeGraphAI. Returns the best email or None.
    Falls back to None (caller tries the basic crawl) if not installed/configured."""
    llm = _llm_config()
    if llm is None:
        return None
    try:
        from scrapegraphai.graphs import SmartScraperGraph  # type: ignore

        graph = SmartScraperGraph(
            prompt="Return the primary business contact email address, or null.",
            source=url,
            config={"llm": llm, "verbose": False, "headless": True},
        )
        result = graph.run()
        text = str(result)
        m = EMAIL_RE.search(text)
        return _clean(m.group(0)) if m else None
    except Exception as exc:  # noqa: BLE001
        log.warning("scrapegraph crawl failed for %s: %s", url, exc)
        return None


def crawl_email_basic(url: str) -> str | None:
    """Fallback: fetch home + a couple of contact pages, regex out an email."""
    candidates: list[str] = []
    for path in ("", "/contact", "/contact-us", "/about"):
        page = _normalize_url(url) + path
        try:
            resp = requests.get(page, timeout=15, headers={"User-Agent": "HommyRecruitmentBot/1.0"})
            if resp.status_code != 200:
                continue
            for m in EMAIL_RE.findall(resp.text):
                cleaned = _clean(m)
                if cleaned:
                    candidates.append(cleaned)
        except requests.RequestException:
            continue
        time.sleep(1)  # politeness between pages of the same site
    # Prefer a domain-matching address if present.
    host = _host(url)
    for c in candidates:
        if host and c.endswith("@" + host):
            return c
    return candidates[0] if candidates else None


def hunter_domain_search(domain: str) -> str | None:
    if not (HUNTER_API_KEY and domain):
        return None
    try:
        r = requests.get(
            "https://api.hunter.io/v2/domain-search",
            params={"domain": domain, "api_key": HUNTER_API_KEY, "limit": 5},
            timeout=20,
        )
        data = r.json().get("data", {})
        emails = data.get("emails", [])
        if not emails:
            return None
        emails.sort(key=lambda e: e.get("confidence", 0), reverse=True)
        return _clean(emails[0].get("value"))
    except Exception as exc:  # noqa: BLE001
        log.warning("hunter domain-search failed for %s: %s", domain, exc)
        return None


def verify_email(email: str) -> int:
    """Return a 0-100 confidence. Without Hunter, trust a basic syntactic pass
    at a modest confidence so the pipeline still works in a no-key setup."""
    if not email:
        return 0
    if not HUNTER_API_KEY:
        return 75 if EMAIL_RE.fullmatch(email) else 0
    try:
        r = requests.get(
            "https://api.hunter.io/v2/email-verifier",
            params={"email": email, "api_key": HUNTER_API_KEY},
            timeout=20,
        )
        data = r.json().get("data", {})
        status = data.get("status")  # deliverable | risky | undeliverable | unknown
        score = int(data.get("score") or 0)
        if status == "undeliverable":
            return 0
        return score
    except Exception as exc:  # noqa: BLE001
        log.warning("hunter verify failed for %s: %s", email, exc)
        return 0


def find_email(website: str | None, domain: str | None) -> tuple[str | None, int]:
    """Run the waterfall; return (email, confidence) or (None, 0)."""
    email = None
    if website:
        email = crawl_email_scrapegraph(website) or crawl_email_basic(website)
    if not email and domain:
        email = hunter_domain_search(domain)
    if not email:
        return None, 0
    confidence = verify_email(email)
    if confidence < MIN_CONFIDENCE:
        return None, confidence
    return email.lower(), confidence


# ── Queue processing ─────────────────────────────────────────────────────────

CLAIM_SQL = """
UPDATE prospect_enrichment_jobs j
SET status = 'claimed', claimed_at = now(), locked_by = %s,
    attempts = attempts + 1, updated_at = now()
WHERE j.id IN (
    SELECT id FROM prospect_enrichment_jobs
    WHERE status = 'queued' OR (status = 'error' AND attempts < %s)
    ORDER BY created_at
    LIMIT %s
    FOR UPDATE SKIP LOCKED
)
RETURNING j.id, j.prospect_id;
"""


def process_batch(conn: psycopg.Connection) -> int:
    with conn.cursor() as cur:
        cur.execute(CLAIM_SQL, (WORKER_ID, MAX_ATTEMPTS, BATCH_SIZE))
        jobs = cur.fetchall()
    conn.commit()
    if not jobs:
        return 0

    for job_id, prospect_id in jobs:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT website, domain FROM contractor_prospects WHERE id = %s",
                    (prospect_id,),
                )
                row = cur.fetchone()
            if not row:
                _finish_job(conn, job_id, "error", "prospect missing")
                continue

            website, domain = row
            email, confidence = find_email(website, domain)

            with conn.cursor() as cur:
                if email:
                    cur.execute(
                        """UPDATE contractor_prospects
                           SET email = %s, email_confidence = %s,
                               enrichment_status = 'email_verified', updated_at = now()
                           WHERE id = %s""",
                        (email, confidence, prospect_id),
                    )
                else:
                    cur.execute(
                        """UPDATE contractor_prospects
                           SET enrichment_status = 'no_email', updated_at = now()
                           WHERE id = %s""",
                        (prospect_id,),
                    )
            _finish_job(conn, job_id, "done", None)
            log.info("prospect %s -> %s (conf %s)", prospect_id, email or "no_email", confidence)
        except psycopg.errors.UniqueViolation:
            # Another prospect already owns this email — drop it, don't fail.
            conn.rollback()
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE contractor_prospects SET enrichment_status='no_email', updated_at=now() WHERE id=%s",
                    (prospect_id,),
                )
            _finish_job(conn, job_id, "done", "duplicate email")
        except Exception as exc:  # noqa: BLE001
            conn.rollback()
            _finish_job(conn, job_id, "error", str(exc)[:500])
            log.exception("job %s failed", job_id)

    return len(jobs)


def _finish_job(conn: psycopg.Connection, job_id: str, status: str, err: str | None) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE prospect_enrichment_jobs SET status=%s, last_error=%s, updated_at=now() WHERE id=%s",
            (status, err, job_id),
        )
    conn.commit()


# ── Helpers ──────────────────────────────────────────────────────────────────

def _clean(email: str | None) -> str | None:
    if not email:
        return None
    e = email.strip().lower().rstrip(".")
    local = e.split("@", 1)[0]
    if any(bad in local for bad in BAD_LOCALPARTS):
        return None
    return e if EMAIL_RE.fullmatch(e) else None


def _normalize_url(url: str) -> str:
    u = url if "://" in url else "https://" + url
    return u.rstrip("/")


def _host(url: str) -> str | None:
    try:
        from urllib.parse import urlparse

        netloc = urlparse(_normalize_url(url)).netloc
        return netloc.replace("www.", "").lower() or None
    except Exception:  # noqa: BLE001
        return None


def main() -> None:
    log.info("recruitment worker %s starting (batch=%s poll=%ss)", WORKER_ID, BATCH_SIZE, POLL_SECONDS)
    # autocommit off; we commit explicitly around claims/finishes. Disable
    # server-side prepares so it works against the Supavisor pooler too.
    with psycopg.connect(DATABASE_URL, prepare_threshold=None) as conn:
        while True:
            try:
                n = process_batch(conn)
            except Exception:  # noqa: BLE001
                log.exception("batch failed; backing off")
                try:
                    conn.rollback()
                except Exception:  # noqa: BLE001
                    pass
                n = 0
            if n == 0:
                if RUN_ONCE:
                    log.info("queue empty — exiting (RUN_ONCE)")
                    return
                time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
