// Service areas — WHERE Hommy operates. Launch is roofing in Texas + Florida
// only, so we gate the homeowner lead funnel by the visitor's region and steer
// out-of-area homeowners to a waitlist (see /coming-soon). Kept as STATIC config
// (no DB query) so the gate stays free at the edge in proxy.ts.
//
// Service-neutral on purpose (docs/HOMMY_PLATFORM.md §0): this is platform
// coverage, not a roofing concept — other verticals will reuse it.

// ── Where we operate (ISO 3166-2 subdivision codes) ───────────────────────────
/** The states we serve at launch. Add a code here to open a new state. */
export const OPERATING_STATES = ['TX', 'FL'] as const

export type OperatingState = (typeof OPERATING_STATES)[number]

/**
 * Specific served cities OUTSIDE the operating states, matched by country +
 * city name. Region (province) codes are too coarse to open a single city, so
 * we match the edge city header directly. Add a row to open a new city.
 */
export const OPERATING_CITIES: { country: string; city: string }[] = [
  { country: 'PK', city: 'Bahawalnagar' },
]

/** Full names for friendly copy on the coming-soon page. */
export const OPERATING_STATE_NAMES: Record<OperatingState, string> = {
  TX: 'Texas',
  FL: 'Florida',
}

/** Human label for marketing copy, e.g. "Texas and Florida". */
export const OPERATING_AREAS_LABEL = 'Texas and Florida'

// ── Geo detection (Vercel edge headers) ───────────────────────────────────────
// Vercel injects these on every incoming request in production. They are ABSENT
// in local `next dev` — callers must fail open when the region is unknown.
/** ISO 3166-2 subdivision code, e.g. "TX", "FL", "CA". */
export const GEO_REGION_HEADER = 'x-vercel-ip-country-region'
/** ISO 3166-1 alpha-2 country code, e.g. "US". */
export const GEO_COUNTRY_HEADER = 'x-vercel-ip-country'
/** City name, e.g. "Austin", "Bahawalnagar" (percent-encoded by Vercel). */
export const GEO_CITY_HEADER = 'x-vercel-ip-city'

/** Cookie that lets a mis-geolocated real customer bypass the gate (safety valve). */
export const AREA_BYPASS_COOKIE = 'hommy-area'
export const AREA_BYPASS_VALUE = 'ok'

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Is this visitor inside a state we serve? Region codes are US-specific, so a
 * non-US region (e.g. "ON") simply won't match. Returns false ONLY when the
 * region is known and not served — callers decide what to do with `null`.
 */
export function isServedRegion(
  region: string | null | undefined,
  country?: string | null,
): boolean {
  if (!region) return false
  if (country && country.toUpperCase() !== 'US') return false
  return (OPERATING_STATES as readonly string[]).includes(region.toUpperCase())
}

/** Is this visitor in a specifically-served city (e.g. Bahawalnagar, PK)? */
export function isServedCity(
  city: string | null | undefined,
  country?: string | null,
): boolean {
  if (!city) return false
  const c = (country ?? '').toUpperCase()
  const name = city.trim().toLowerCase()
  return OPERATING_CITIES.some(
    (o) => o.country.toUpperCase() === c && o.city.toLowerCase() === name,
  )
}

/** Served if the visitor's state OR their city is in our coverage. */
export function isServedLocation(
  region: string | null | undefined,
  country: string | null | undefined,
  city: string | null | undefined,
): boolean {
  return isServedRegion(region, country) || isServedCity(city, country)
}

/** Full state name for a region code, or null when unknown (for personalized copy). */
export function regionLabel(region: string | null | undefined): string | null {
  if (!region) return null
  const code = region.toUpperCase()
  return OPERATING_STATE_NAMES[code as OperatingState] ?? null
}
