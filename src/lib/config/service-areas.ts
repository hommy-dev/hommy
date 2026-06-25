// Service areas — WHERE Hommy operates. At launch we gate the homeowner lead
// funnel by COUNTRY: Hommy is live in the United States, and visitors outside
// the US are steered to a waitlist (see /coming-soon). Country-level IP geo is
// highly reliable (unlike city/region geolocation), so this gate is both simple
// and robust — no risk of wrongly blocking a real in-area customer because their
// ISP/mobile carrier resolves to the wrong city.
//
// Kept as STATIC config (no DB query) so the gate stays free at the edge in
// proxy.ts. Service-neutral on purpose (docs/HOMMY_PLATFORM.md §0): this is
// platform coverage, not a roofing concept — other verticals will reuse it.

// ── Where we operate (ISO 3166-1 alpha-2 country codes) ───────────────────────
/** Countries we serve at launch. Add a code here to open a new country. */
export const OPERATING_COUNTRIES = ['US'] as const

export type OperatingCountry = (typeof OPERATING_COUNTRIES)[number]

/** Human label for marketing copy, e.g. "the United States". */
export const OPERATING_AREAS_LABEL = 'the United States'

// ── SEO coverage (states) ─────────────────────────────────────────────────────
// NOT used for gating — only to drive SEO location pages (/roofing/[state]) and
// to render friendly state names. The lead funnel is gated by COUNTRY (above),
// not by state, so a US visitor in any state passes.
/** States with dedicated SEO location pages. Add a code to publish a new state. */
export const OPERATING_STATES = ['TX', 'FL'] as const

export type OperatingState = (typeof OPERATING_STATES)[number]

/** Full names for friendly copy / SEO pages. */
export const OPERATING_STATE_NAMES: Record<OperatingState, string> = {
  TX: 'Texas',
  FL: 'Florida',
}

/**
 * Every US state + DC, code → name. We seed the FULL geography (states + their
 * cities) so any market is ready the moment a roofer covers it — no per-city
 * babysitting as we scale. `isOperating` (which states are *marketed* / shown on
 * the /roofing hub) stays controlled by OPERATING_STATES above; seeding a state
 * here does NOT publish it, and lead matching is geo-generic regardless.
 */
export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

// ── Geo detection (Vercel edge headers) ───────────────────────────────────────
// Vercel injects these on every incoming request in production. They are ABSENT
// in local `next dev` — callers must fail open when the country is unknown.
/** ISO 3166-1 alpha-2 country code, e.g. "US". */
export const GEO_COUNTRY_HEADER = 'x-vercel-ip-country'
/** ISO 3166-2 subdivision code, e.g. "TX", "FL", "CA" (for SEO/personalized copy). */
export const GEO_REGION_HEADER = 'x-vercel-ip-country-region'

/** Cookie that lets a mis-geolocated or testing visitor bypass the gate (safety valve). */
export const AREA_BYPASS_COOKIE = 'hommy-area'
export const AREA_BYPASS_VALUE = 'ok'

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Is this visitor in a country we serve? Returns false ONLY when the country is
 * KNOWN and not served — callers fail open on `null` (local dev, missing header)
 * rather than wrongly block.
 */
export function isServedCountry(country: string | null | undefined): boolean {
  if (!country) return false
  return (OPERATING_COUNTRIES as readonly string[]).includes(country.toUpperCase())
}

/** Full state name for a region code, or null when unknown (for personalized copy). */
export function regionLabel(region: string | null | undefined): string | null {
  if (!region) return null
  const code = region.toUpperCase()
  return OPERATING_STATE_NAMES[code as OperatingState] ?? null
}
