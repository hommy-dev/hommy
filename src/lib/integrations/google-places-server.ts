// Server-side Google Places (New) Text Search — used by the recruitment engine
// to DISCOVER companies near an uncovered lead/area. Distinct from the
// client-side google-places-client.ts (which only does Place Details for review
// import). Needs a SERVER key (GOOGLE_PLACES_API_KEY) — the NEXT_PUBLIC maps key
// is browser/referrer-restricted and unsuitable for server fetches.
//
// No-ops cleanly (returns []) when the key is unset, so dev/build never break.

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''
const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.rating',
  'places.userRatingCount',
  'places.formattedAddress',
  'nextPageToken',
].join(',')

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

type PlacesResponse = {
  places?: Array<{
    id?: string
    displayName?: { text?: string }
    location?: { latitude?: number; longitude?: number }
    websiteUri?: string
    nationalPhoneNumber?: string
    rating?: number
    userRatingCount?: number
    formattedAddress?: string
  }>
  nextPageToken?: string
}

/** True when a server Places key is configured. */
export function placesConfigured(): boolean {
  return !!PLACES_KEY
}

/**
 * Text Search around a point, paginated up to `maxResults`. `query` is the
 * service search term (e.g. "roofing contractor"); the point + radius bias
 * results to the uncovered area.
 */
export async function searchPlaces(opts: {
  query: string
  lat: number
  lng: number
  radiusMeters: number
  maxResults: number
}): Promise<DiscoveredPlace[]> {
  if (!PLACES_KEY) {
    console.warn('[places-server] GOOGLE_PLACES_API_KEY not set — discovery skipped')
    return []
  }

  const out: DiscoveredPlace[] = []
  let pageToken: string | undefined

  while (out.length < opts.maxResults) {
    const body: Record<string, unknown> = {
      textQuery: opts.query,
      locationBias: {
        circle: {
          center: { latitude: opts.lat, longitude: opts.lng },
          radius: Math.min(opts.radiusMeters, 50_000), // Places caps radius at 50km
        },
      },
    }
    if (pageToken) body.pageToken = pageToken

    let res: Response
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_KEY,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(body),
      })
    } catch (err) {
      console.error('[places-server] fetch failed', err)
      break
    }
    if (!res.ok) {
      console.error('[places-server] non-OK', res.status, await res.text().catch(() => ''))
      break
    }

    const data = (await res.json()) as PlacesResponse
    for (const p of data.places ?? []) {
      if (!p.id) continue
      out.push({
        placeId: p.id,
        name: p.displayName?.text ?? null,
        website: p.websiteUri ?? null,
        phone: p.nationalPhoneNumber ?? null,
        lat: p.location?.latitude ?? null,
        lng: p.location?.longitude ?? null,
        rating: p.rating ?? null,
        reviewCount: p.userRatingCount ?? null,
        formattedAddress: p.formattedAddress ?? null,
      })
    }

    pageToken = data.nextPageToken
    if (!pageToken) break
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
