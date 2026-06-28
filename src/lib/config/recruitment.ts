// Recruitment engine tunables. Service-keyed so nothing roofing-specific leaks
// into the generic discovery/outreach modules (multi-vertical rule).

/** Google Places text-search query per service slug. */
export const RECRUITMENT_SEARCH_TERM: Record<string, string> = {
  roofing: 'roofing contractor',
}

/** Fallback term when a service has no explicit entry. */
export const DEFAULT_SEARCH_TERM = 'contractor'

/** Search radius (meters) around a lead/campaign point for nearby discovery. */
export const DISCOVERY_RADIUS_METERS = 40_000 // ~25 miles

/** Max Places results to pull per discovery run (paginated 20/page). */
export const DISCOVERY_MAX_RESULTS = 60

/** Minimum verifier confidence (0-100) required before a prospect is exported. */
export const MIN_EMAIL_CONFIDENCE = 70

/** Max prospects pushed to the cold-email tool per export run (warmup-friendly). */
export const OUTREACH_EXPORT_BATCH = 200

export function searchTermForService(serviceSlug: string | null | undefined): string {
  if (!serviceSlug) return DEFAULT_SEARCH_TERM
  return RECRUITMENT_SEARCH_TERM[serviceSlug] ?? DEFAULT_SEARCH_TERM
}
