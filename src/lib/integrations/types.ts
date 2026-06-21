// Shared shapes for the Google Places connect/sync flow. The browser fetches
// place content via the Places JS API and POSTs these to the sync server action,
// so client and server agree on the payload here.

export type GooglePlaceSelection = {
  placeId: string
  name: string
  formattedAddress: string | null
  googleMapsUri: string | null
  lat: number | null
  lng: number | null
  rating: number | null
  userRatingCount: number | null
}

export type GoogleReviewPayload = {
  externalId: string
  authorName: string | null
  authorPhotoUrl: string | null
  rating: number | null
  comment: string | null
  sourceUrl: string | null
  /** ISO timestamp. */
  postedAt: string | null
}

export type GoogleMediaPayload = {
  externalId: string
  sourceUrl: string
  caption: string | null
  widthPx: number | null
  heightPx: number | null
  attributionHtml: string | null
}

/** What the browser sends to `syncGooglePlace` on connect + refresh. */
export type GooglePlaceContent = {
  reviews: GoogleReviewPayload[]
  media: GoogleMediaPayload[]
}
