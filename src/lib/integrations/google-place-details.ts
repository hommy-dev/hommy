// Server-side Google Places (New) Place Details — fetches a listing's reviews +
// photos by place_id, for the background auto-connect of a recruited prospect's
// Google profile. This is the server counterpart to the browser-only
// google-places-client.ts (which uses the Maps JS API and can't run in a job).
//
// Uses the SERVER key (GOOGLE_PLACES_API_KEY), same as google-places-server.ts.
// Reviews + photos are billable "atmosphere" fields, so this needs Places API
// (New) billing enabled; without it the call returns empty and auto-connect is a
// safe no-op. No-ops cleanly (returns null) when the key is unset.

import type {
  GooglePlaceContent,
  GooglePlaceSelection,
  GoogleMediaPayload,
  GoogleReviewPayload,
} from './types'

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''
const BASE = 'https://places.googleapis.com/v1'

const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'googleMapsUri',
  'reviews',
  'photos',
].join(',')

// Shapes we read off the Place Details (New) response. Loose — Google omits
// absent fields, so everything is optional.
type PlaceDetailsResponse = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
  reviews?: Array<{
    name?: string
    rating?: number
    text?: { text?: string }
    originalText?: { text?: string }
    publishTime?: string
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string }
  }>
  photos?: Array<{
    name?: string
    widthPx?: number
    heightPx?: number
    authorAttributions?: Array<{ displayName?: string }>
  }>
}

type PhotoMediaResponse = { photoUri?: string; name?: string }

/** True when a server Places key is configured. */
export function placeDetailsConfigured(): boolean {
  return !!PLACES_KEY
}

/**
 * Fetch a place's selection metadata + reviews/photos by place_id, mapped to the
 * shared connect payload. Returns null when the key is unset or the place can't
 * be read; reviews/media come back empty (not null) when the listing simply has
 * none or the key lacks the atmosphere SKU.
 */
export async function fetchPlaceDetailsContent(
  placeId: string,
): Promise<{ selection: GooglePlaceSelection; content: GooglePlaceContent } | null> {
  if (!PLACES_KEY) {
    console.warn('[place-details] GOOGLE_PLACES_API_KEY not set — auto-connect skipped')
    return null
  }
  if (!placeId) return null

  let res: Response
  try {
    res = await fetch(`${BASE}/places/${encodeURIComponent(placeId)}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': PLACES_KEY,
        'X-Goog-FieldMask': DETAILS_FIELD_MASK,
      },
    })
  } catch (err) {
    console.error('[place-details] fetch failed', err)
    return null
  }
  if (!res.ok) {
    console.error('[place-details] non-OK', res.status, await res.text().catch(() => ''))
    return null
  }

  const place = (await res.json()) as PlaceDetailsResponse
  if (!place.id) return null

  const selection: GooglePlaceSelection = {
    placeId: place.id,
    name: place.displayName?.text ?? 'Google Business Profile',
    formattedAddress: place.formattedAddress ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
  }

  const reviews: GoogleReviewPayload[] = (place.reviews ?? [])
    .filter((rv) => rv.name)
    .map((rv) => {
      const author = rv.authorAttribution
      return {
        // The HTTP API gives a STABLE review resource name — use it as the id.
        externalId: rv.name as string,
        authorName: author?.displayName ?? null,
        authorPhotoUrl: author?.photoUri ?? null,
        rating: typeof rv.rating === 'number' ? Math.round(rv.rating) : null,
        comment: rv.text?.text ?? rv.originalText?.text ?? null,
        sourceUrl: author?.uri ?? place.googleMapsUri ?? null,
        postedAt: rv.publishTime ?? null,
      }
    })

  // Photos need a second call each to resolve a key-free, Google-hosted image URL
  // (skipHttpRedirect=true returns the URL as JSON instead of a redirect, so we
  // never embed our API key in a stored/rendered URL).
  const photos = (place.photos ?? []).filter((ph) => ph.name)
  const media: GoogleMediaPayload[] = []
  for (const ph of photos) {
    const url = await resolvePhotoUrl(ph.name as string)
    if (!url) continue
    media.push({
      externalId: ph.name as string,
      sourceUrl: url,
      caption: null,
      widthPx: ph.widthPx ?? null,
      heightPx: ph.heightPx ?? null,
      attributionHtml:
        (ph.authorAttributions ?? [])
          .map((a) => a.displayName)
          .filter(Boolean)
          .join(', ') || null,
    })
  }

  return { selection, content: { reviews, media } }
}

/** Resolve a photo resource name to a stable Google-hosted image URL. */
async function resolvePhotoUrl(photoName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${BASE}/${photoName}/media?maxWidthPx=1200&skipHttpRedirect=true`,
      { method: 'GET', headers: { 'X-Goog-Api-Key': PLACES_KEY } },
    )
    if (!res.ok) return null
    const data = (await res.json()) as PhotoMediaResponse
    return data.photoUri ?? null
  } catch (err) {
    console.error('[place-details] photo resolve failed', err)
    return null
  }
}
