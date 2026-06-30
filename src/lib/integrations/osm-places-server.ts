// Server-side place discovery for the recruitment engine — finds companies near
// an uncovered lead/area. Backed by the OpenStreetMap Overpass API: no API key,
// no signup, no billing card. Exposed through the same DiscoveredPlace contract
// the discovery engine consumes, so it's a drop-in for the old Google/Foursquare
// search.
//
// Tradeoffs vs. Google: OSM business coverage is sparser and there are no
// ratings/review counts (always null). Companies with a website get queued for
// email enrichment; those without are marked no_email, exactly as before.
//
// No external endpoint config needed; override with OVERPASS_ENDPOINT if a
// specific mirror is preferred. Never throws — returns [] on any failure so
// dev/build never break.

const OVERPASS_ENDPOINT =
  process.env.OVERPASS_ENDPOINT ?? 'https://overpass-api.de/api/interpreter'

// Polite identifying UA — public Overpass instances rate-limit anonymous traffic.
const USER_AGENT = 'hommy-recruitment/1.0 (+https://www.hommy.online)'

export type DiscoveredPlace = {
  placeId: string
  name: string | null
  website: string | null
  phone: string | null
  lat: number | null
  lng: number | null
  rating: number | null
  reviewCount: number | null
  formattedAddress: string | null
}

type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

type OverpassResponse = { elements?: OverpassElement[] }

/** OSM has no key to configure — discovery is always available. */
export function placesConfigured(): boolean {
  return true
}

/**
 * Derive a search stem from the service term. Overpass matches OSM tags, not
 * free text, so we reduce "roofing contractor" → "roof" and match it (case-
 * insensitively, as a substring) against `name` and `craft`. Stripping the
 * suffix lets "roof" hit "Roofing", "Roofer", "Roofs", etc.
 */
function keywordFromQuery(query: string): string {
  const first = (query.trim().split(/\s+/)[0] || query).toLowerCase()
  return first.replace(/(ing|ers|er|s)$/, '') || first
}

/** Compose a human-readable address from OSM addr:* tags. */
function addressFromTags(t: Record<string, string>): string | null {
  const parts = [
    [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '),
    t['addr:city'],
    t['addr:state'],
    t['addr:postcode'],
  ].filter((s) => s && s.length)
  return parts.length ? parts.join(', ') : null
}

function mapElement(el: OverpassElement): DiscoveredPlace | null {
  const t = el.tags ?? {}
  if (!t.name) return null // unnamed POIs are useless for outreach
  return {
    placeId: `${el.type}/${el.id}`, // stable OSM ref → dedupe key (sourceRef)
    name: t.name,
    website: t.website ?? t['contact:website'] ?? null,
    phone: t.phone ?? t['contact:phone'] ?? null,
    lat: el.lat ?? el.center?.lat ?? null,
    lng: el.lon ?? el.center?.lon ?? null,
    rating: null, // OSM has no ratings
    reviewCount: null,
    formattedAddress: addressFromTags(t),
  }
}

/**
 * Find named businesses around a point. Signature matches the old Google
 * searchPlaces so the discovery engine is unchanged. `query` is the service
 * term (e.g. "roofing contractor"); only its stem is used for tag matching.
 */
export async function searchPlaces(opts: {
  query: string
  lat: number
  lng: number
  radiusMeters: number
  maxResults: number
}): Promise<DiscoveredPlace[]> {
  const kw = keywordFromQuery(opts.query)
  const around = `around:${Math.round(opts.radiusMeters)},${opts.lat},${opts.lng}`

  // Match the OSM `craft` tag against the stem (case-insensitive substring):
  // kw "roof" → craft=roofer, "paint" → craft=painter, etc. `craft` is a rare,
  // cheap tag — broadening to a name regex over shop/office instead times out
  // Overpass on large (40km) radii, so we deliberately keep to craft only.
  const ql =
    `[out:json][timeout:25];` +
    `nwr["craft"~"${kw}",i](${around});` +
    `out tags center ${opts.maxResults};`

  let res: Response
  try {
    res = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: `data=${encodeURIComponent(ql)}`,
    })
  } catch (err) {
    console.error('[places-server] Overpass fetch failed', err)
    return []
  }
  if (!res.ok) {
    console.error('[places-server] Overpass non-OK', res.status, await res.text().catch(() => ''))
    return []
  }

  const data = (await res.json()) as OverpassResponse
  const out: DiscoveredPlace[] = []
  const seen = new Set<string>()
  for (const el of data.elements ?? []) {
    const mapped = mapElement(el)
    if (!mapped || seen.has(mapped.placeId)) continue
    seen.add(mapped.placeId)
    out.push(mapped)
  }
  return out.slice(0, opts.maxResults)
}

/** Normalize a website URL to its bare host (for Hunter lookup + dedupe). */
export function domainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url.includes('://') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./i, '').toLowerCase() || null
  } catch {
    return null
  }
}
