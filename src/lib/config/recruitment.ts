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

/**
 * Max recruitment emails we'll ever send one prospect. We re-email (a fresh
 * nudge) each time a new job lands in their area, but stop after this many
 * touches even if they never sign up. Signing up (convertedToContractorId set)
 * stops outreach immediately, regardless of count.
 */
export const MAX_OUTREACH_EMAILS = 4

/**
 * Minimum hours between two emails to the same prospect. 0 = every new job in
 * their area sends a fresh nudge immediately (still bounded by the lifetime cap
 * MAX_OUTREACH_EMAILS). Raise this if a burst of leads ever starts reading as spam.
 */
export const OUTREACH_FOLLOWUP_COOLDOWN_HOURS = 0

/**
 * Radius (meters) that defines "this area" when a new job re-nudges nearby
 * prospects. Matches the discovery radius so anyone we found for the area is
 * eligible to be re-emailed when fresh demand shows up there.
 */
export const OUTREACH_AREA_RADIUS_METERS = DISCOVERY_RADIUS_METERS

export function searchTermForService(serviceSlug: string | null | undefined): string {
  if (!serviceSlug) return DEFAULT_SEARCH_TERM
  return RECRUITMENT_SEARCH_TERM[serviceSlug] ?? DEFAULT_SEARCH_TERM
}
