'use client'

// Browser-side Google Places fetch for a connected listing. Pulls the (up to 5)
// reviews + photos the Places API exposes and maps them to the sync payload the
// server action persists. Reviews/photos are billable Places fields, so this is
// called only on connect + manual refresh — never while typing in the picker.

import { importLibrary } from '@googlemaps/js-api-loader'
import { ensureGoogleMapsOptions } from '@/lib/google-maps'
import type {
  GoogleMediaPayload,
  GooglePlaceContent,
  GoogleReviewPayload,
} from './types'

export async function fetchPlaceContent(placeId: string): Promise<GooglePlaceContent> {
  ensureGoogleMapsOptions()
  const places = await importLibrary('places')
  const place = new places.Place({ id: placeId })
  await place.fetchFields({
    fields: ['reviews', 'photos', 'googleMapsURI'],
  })

  const reviews: GoogleReviewPayload[] = (place.reviews ?? []).map((rv, i) => {
    const author = rv.authorAttribution
    const posted = rv.publishTime ? rv.publishTime.toISOString() : null
    return {
      // Reviews carry no stable id in the JS API — key on time + author.
      externalId: `g:${posted ?? i}:${author?.displayName ?? 'anon'}`,
      authorName: author?.displayName ?? null,
      authorPhotoUrl: author?.photoURI ?? null,
      rating: typeof rv.rating === 'number' ? Math.round(rv.rating) : null,
      comment: rv.text ?? null,
      sourceUrl: author?.uri ?? place.googleMapsURI ?? null,
      postedAt: posted,
    }
  })

  const media: GoogleMediaPayload[] = (place.photos ?? []).map((ph, i) => ({
    externalId: `photo:${i}`,
    sourceUrl: ph.getURI({ maxWidth: 1200 }),
    caption: null,
    widthPx: ph.widthPx ?? null,
    heightPx: ph.heightPx ?? null,
    attributionHtml:
      (ph.authorAttributions ?? [])
        .map((a) => a.displayName)
        .filter(Boolean)
        .join(', ') || null,
  }))

  // Diagnostic: if these are 0 while the listing clearly has reviews/photos, the
  // API key is missing the Places API (New) "atmosphere" SKU / billing — reviews
  // and photos are billable fields and come back empty without it.
  console.info('[integrations] fetched place content', {
    placeId,
    reviews: reviews.length,
    photos: media.length,
    rawReviews: place.reviews?.length ?? 0,
    rawPhotos: place.photos?.length ?? 0,
  })

  return { reviews, media }
}
