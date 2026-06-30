// Apollo.io email-finder adapter. DORMANT by default — used only by the
// recruitment email-finder's escalation path (RECRUITMENT_ESCALATION_ENABLED=
// 'true' + key set) to find an email for a prospect that has NO website to crawl.
// Apollo's free tier includes a generous monthly credit allotment. Degrades to a
// no-op (returns null) when unconfigured.
//
// NOTE: confirm the exact endpoint, auth header, and response shape against
// Apollo's API docs when you enable this. Apollo typically needs an organization
// domain to resolve people; for a no-website prospect we only have a company
// name + city, so matches will be best-effort.

const API_KEY = process.env.APOLLO_API_KEY ?? ''
const MATCH_URL = 'https://api.apollo.io/api/v1/people/match'
const TIMEOUT_MS = 10000

/** True when an Apollo key is configured. */
export function apolloConfigured(): boolean {
  return !!API_KEY
}

type ApolloPerson = { email?: string | null }
type ApolloMatchResponse = { person?: ApolloPerson }

/**
 * Best-effort email lookup for a company. Returns an email string or null when
 * unconfigured / not found / on error.
 */
export async function findEmailViaApollo(opts: {
  companyName: string | null
  domain: string | null
  city: string | null
}): Promise<string | null> {
  if (!API_KEY) return null
  if (!opts.companyName && !opts.domain) return null

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(MATCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        organization_name: opts.companyName ?? undefined,
        domain: opts.domain ?? undefined,
        reveal_personal_emails: true,
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      console.error('[apollo] non-OK', res.status)
      return null
    }
    const data = (await res.json()) as ApolloMatchResponse
    const email = data.person?.email?.trim()
    // Apollo returns masked placeholders like "email_not_unlocked@domain.com"
    // when no credit is spent — reject those.
    if (!email || email.includes('not_unlocked') || email.includes('domain.com')) return null
    return email
  } catch (err) {
    console.error('[apollo] match failed', err)
    return null
  } finally {
    clearTimeout(t)
  }
}
