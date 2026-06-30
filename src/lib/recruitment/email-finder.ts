// Email finder for the recruitment engine — NO AI. Replaces the Python worker's
// ScrapeGraphAI/Hunter waterfall with a plain website crawl + free local checks.
//
// Strategy (decided): crawl the company's own website; if we find a real email
// there (gmail/yahoo addresses are fine), keep it and let outreach send to it.
// If we find nothing, mark no_email and skip — there's plenty of contractor
// supply, so we don't guess-and-send. The ONLY validation is free and local:
// syntax + junk-localpart + disposable-domain + MX (DNS) lookup. We never do an
// SMTP/port-25 probe (blocked on Vercel) and never call a paid verifier in this
// default path.
//
// ESCALATION (dormant, off unless RECRUITMENT_ESCALATION_ENABLED='true'): when a
// crawl finds nothing we may pattern-guess (info@/office@/contact@) and REQUIRE
// an external verifier (EmailAwesome) to confirm before accepting, and use Apollo
// to find emails for prospects with no website. Both adapters degrade to no-ops
// when their key is unset, like the Places adapters.
//
// Never throws — every failure path returns a no_email result so the Inngest
// worker can write back cleanly.

import { emailVerifierConfigured, verifyEmailExternal } from '@/lib/integrations/emailawesome-server'
import { apolloConfigured, findEmailViaApollo } from '@/lib/integrations/apollo-server'

const CRAWL_PATHS = ['', '/contact', '/contact-us', '/about'] as const
const FETCH_TIMEOUT_MS = 8000
const MX_TIMEOUT_MS = 3000
const USER_AGENT = 'HommyRecruitmentBot/1.0 (+https://hommy.online)'

// Confidence assigned to an email found on the company's OWN website that passed
// the free checks: high trust, but NOT externally deliverability-verified. Sits
// above MIN_EMAIL_CONFIDENCE (70) so it's eligible for outreach.
const FOUND_ON_SITE_CONFIDENCE = 80

// Global regex for EXTRACTING addresses from page text; anchored copy for VALIDATING.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const EMAIL_FULL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

// Localparts that are never a real human/business inbox worth contacting —
// includes template/placeholder localparts left in site boilerplate.
const JUNK_LOCALPARTS = new Set([
  'noreply', 'no-reply', 'donotreply', 'do-not-reply', 'example', 'sentry',
  'wixpress', 'mailer-daemon', 'postmaster', 'abuse', 'test',
  'your.email', 'youremail', 'your-email', 'yourname', 'name', 'email',
  'username', 'firstname', 'lastname', 'user',
])

// Reserved/placeholder domains (RFC 2606 + common template boilerplate) — an
// address here is never a real inbox even if the domain has an A record.
const PLACEHOLDER_DOMAINS = new Set([
  'example.com', 'example.org', 'example.net', 'example.edu',
  'domain.com', 'yourdomain.com', 'yourcompany.com', 'company.com',
  'email.com', 'test.com', 'sentry.io', 'wixpress.com',
  // Website-builder default placeholders an owner forgot to replace (Wix, etc.).
  'mysite.com', 'yoursite.com', 'site.com', 'mydomain.com', 'yourwebsite.com',
  'website.com', 'sentry.wixpress.com',
])

// Image/asset extensions that the email regex can falsely match (e.g. logo@2x.png).
const ASSET_TLDS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'])

// Common disposable/temporary email domains. Source: the widely-used
// `disposable-email-domains` list — inlined (a representative subset) to stay
// zero-dependency. Refresh from https://github.com/disposable-email-domains if needed.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'temp-mail.org', 'throwawaymail.com', 'yopmail.com', 'getnada.com',
  'trashmail.com', 'sharklasers.com', 'maildrop.cc', 'fakeinbox.com',
  'dispostable.com', 'mailnesia.com', 'mintemail.com', 'spamgourmet.com',
])

export type FindResult =
  | { status: 'email_found' | 'email_verified'; email: string; confidence: number }
  | { status: 'no_email'; email: null; confidence: 0; reason: string }

function escalationEnabled(): boolean {
  return process.env.RECRUITMENT_ESCALATION_ENABLED === 'true'
}

/** Bare hostname (no scheme, no www) of a URL-ish string, or null. */
function hostOf(urlish: string | null | undefined): string | null {
  if (!urlish) return null
  try {
    const u = new URL(urlish.includes('://') ? urlish : `https://${urlish}`)
    return u.hostname.replace(/^www\./i, '').toLowerCase() || null
  } catch {
    return null
  }
}

/** Lowercase + strip trailing junk; reject junk localparts, asset matches, bad syntax. */
export function cleanEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase().replace(/[.,;:)>\]]+$/, '')
  if (!EMAIL_FULL_RE.test(email)) return null
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return null
  if (JUNK_LOCALPARTS.has(localPart)) return null
  if (PLACEHOLDER_DOMAINS.has(domain)) return null
  const tld = domain.split('.').pop() ?? ''
  if (ASSET_TLDS.has(tld)) return null
  return email
}

export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase())
}

// DNS-over-HTTPS resolvers. We use DoH instead of node:dns/resolveMx because raw
// DNS (UDP/TCP port 53) is blocked or unreliable in many environments (sandboxes,
// some serverless egress); DoH works anywhere `fetch` does. Google first, then
// Cloudflare as a fallback. JSON wire format: Status 0 = NOERROR; type 15 = MX, 1 = A.
const DOH_ENDPOINTS = [
  'https://dns.google/resolve',
  'https://cloudflare-dns.com/dns-query',
] as const

type DohAnswer = { type: number }
type DohResponse = { Status: number; Answer?: DohAnswer[] }

async function dohQuery(name: string, type: 'MX' | 'A'): Promise<DohResponse | null> {
  for (const base of DOH_ENDPOINTS) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), MX_TIMEOUT_MS)
    try {
      const res = await fetch(`${base}?name=${encodeURIComponent(name)}&type=${type}`, {
        headers: { Accept: 'application/dns-json' },
        signal: ctrl.signal,
      })
      if (res.ok) return (await res.json()) as DohResponse
    } catch {
      // try next resolver
    } finally {
      clearTimeout(t)
    }
  }
  return null
}

/**
 * True when the domain can receive mail: has MX records, or (per RFC 5321's
 * implicit-MX rule) an A record. Uses DNS-over-HTTPS. Returns false only when a
 * resolver actually answered with no MX and no A; if DoH is unreachable it
 * returns true (don't drop an address we found on a live, reachable site over a
 * transient DNS hiccup — the crawl already proved the domain resolves).
 */
export async function hasMx(domain: string): Promise<boolean> {
  const mx = await dohQuery(domain, 'MX')
  if (mx === null) return true // DoH unreachable — don't penalize a crawl-verified domain
  if (mx.Status === 0 && mx.Answer?.some((a) => a.type === 15)) return true
  const a = await dohQuery(domain, 'A')
  if (a === null) return true
  return a.Status === 0 && !!a.Answer?.some((x) => x.type === 1)
}

/** Fetch one page with a timeout; returns body text or '' on any failure. */
async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' },
      signal: ctrl.signal,
      redirect: 'follow',
    })
    if (!res.ok) return ''
    return await res.text()
  } catch {
    return ''
  } finally {
    clearTimeout(t)
  }
}

/** Crawl the site's contact-ish pages and return cleaned, de-duped email candidates. */
export async function crawlSiteForEmails(website: string): Promise<string[]> {
  const base = website.includes('://') ? website : `https://${website}`
  let origin: string
  try {
    origin = new URL(base).origin
  } catch {
    return []
  }

  const found = new Set<string>()
  for (const path of CRAWL_PATHS) {
    const html = await fetchText(origin + path)
    if (!html) continue
    // Decode the most common HTML entity that breaks emails, then regex-scan.
    const text = html.replace(/&#64;|&#x40;/gi, '@')
    for (const match of text.matchAll(EMAIL_RE)) {
      const cleaned = cleanEmail(match[0])
      if (cleaned) found.add(cleaned)
    }
    // Small win: if the homepage already yielded addresses, the contact page
    // rarely adds better ones — but we still crawl all paths for best coverage.
  }
  return [...found]
}

/** Prefer an address on the company's own domain; else the first clean candidate. */
export function pickBestEmail(candidates: string[], host: string | null): string | null {
  if (candidates.length === 0) return null
  if (host) {
    const onDomain = candidates.find((e) => {
      const d = e.split('@')[1]
      return d === host || d.endsWith(`.${host}`)
    })
    if (onDomain) return onDomain
  }
  return candidates[0]
}

/** Run the free local checks on a candidate email. */
async function passesFreeChecks(email: string): Promise<boolean> {
  const domain = email.split('@')[1]
  if (!domain) return false
  if (isDisposableDomain(domain)) return false
  return hasMx(domain)
}

/**
 * Find one prospect's email. Default path = crawl-only; escalation adds
 * pattern-guess+verify and Apollo, only when explicitly enabled and configured.
 */
export async function findEmailForProspect(p: {
  website: string | null
  domain: string | null
  companyName?: string | null
  city?: string | null
}): Promise<FindResult> {
  const host = hostOf(p.website) ?? (p.domain ? p.domain.toLowerCase() : null)

  // 1) Crawl the website (the workhorse, free + unlimited).
  if (p.website) {
    const candidates = await crawlSiteForEmails(p.website)
    const best = pickBestEmail(candidates, host)
    if (best && (await passesFreeChecks(best))) {
      return { status: 'email_found', email: best, confidence: FOUND_ON_SITE_CONFIDENCE }
    }
  }

  // 2) Escalation — dormant unless explicitly enabled.
  if (escalationEnabled()) {
    const escalated = await escalate(p, host)
    if (escalated) return escalated
  }

  return { status: 'no_email', email: null, confidence: 0, reason: p.website ? 'crawl found none' : 'no website' }
}

/**
 * Escalation waterfall (only when RECRUITMENT_ESCALATION_ENABLED='true'):
 *   • site has no findable email → pattern-guess info@/office@/contact@, REQUIRE
 *     external verification before accepting (never send an unverified guess).
 *   • no website at all → Apollo finder, then the same free checks.
 */
async function escalate(
  p: { website: string | null; domain: string | null; companyName?: string | null; city?: string | null },
  host: string | null,
): Promise<FindResult | null> {
  // Pattern-guess + verify (needs a domain + a configured verifier).
  if (host && emailVerifierConfigured()) {
    for (const local of ['info', 'office', 'contact'] as const) {
      const guess = `${local}@${host}`
      const cleaned = cleanEmail(guess)
      if (!cleaned) continue
      const verdict = await verifyEmailExternal(cleaned)
      if (verdict?.deliverable && (await passesFreeChecks(cleaned))) {
        return { status: 'email_verified', email: cleaned, confidence: Math.max(70, verdict.score) }
      }
    }
  }

  // No-website prospects → Apollo, then free checks.
  if (!p.website && apolloConfigured()) {
    const found = await findEmailViaApollo({
      companyName: p.companyName ?? null,
      domain: p.domain ?? null,
      city: p.city ?? null,
    })
    const cleaned = found ? cleanEmail(found) : null
    if (cleaned && (await passesFreeChecks(cleaned))) {
      // If a verifier is also configured, require deliverable; else accept on free checks.
      if (emailVerifierConfigured()) {
        const verdict = await verifyEmailExternal(cleaned)
        if (verdict && !verdict.deliverable) return null
        return { status: 'email_verified', email: cleaned, confidence: Math.max(70, verdict?.score ?? 75) }
      }
      return { status: 'email_found', email: cleaned, confidence: FOUND_ON_SITE_CONFIDENCE }
    }
  }

  return null
}
