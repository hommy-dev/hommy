// Server-side Google Places (New) Text Search — the PREFERRED recruitment
// discovery source when a server key is configured and unblocked. Returns the
// shared DiscoveredPlace shape (incl. rating + review count, which OSM lacks).
//
// Needs a SERVER key (GOOGLE_PLACES_API_KEY) with the "Places API (New)" service
// enabled and allowed on the key's API restrictions. The NEXT_PUBLIC maps key is
// browser/referrer-restricted and unsuitable for server fetches.
//
// Never throws: returns [] on missing key / non-OK / network error, so the
// caller (discovery) can cleanly fall back to the OSM provider.

import type { DiscoveredPlace } from './osm-places-server'

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

/** True when a server Places key is configured (does not verify it's unblocked). */
export function googleConfigured(): boolean {
  return !!PLACES_KEY
}

/**
 * Text Search around a point, paginated up to `maxResults`. `query` is the
 * service search term (e.g. "roofing contractor"); the point + radius bias
 * results to the uncovered area. Same signature as the OSM provider.
 */
export async function searchPlacesViaGoogle(opts: {
  query: string
  lat: number
  lng: number
  radiusMeters: number
  maxResults: number
}): Promise<DiscoveredPlace[]> {
  if (!PLACES_KEY) return []

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
      console.error('[places-google] fetch failed', err)
      break
    }
    if (!res.ok) {
      console.error('[places-google] non-OK', res.status, await res.text().catch(() => ''))
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
        rating: p.rating ?? null, // Google rating is already 0–5
        reviewCount: p.userRatingCount ?? null,
        formattedAddress: p.formattedAddress ?? null,
      })
    }

    pageToken = data.nextPageToken
    if (!pageToken) break
  }

  return out.slice(0, opts.maxResults)
}
