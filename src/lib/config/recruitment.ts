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

// ── Proactive daily invite engine (cold "founding roofer" outreach) ───────────
// The invite stream is gentler than the lead stream: a cold roofer who never
// asked to hear from us gets at most one nudge after the first email, then we
// stop — honesty + deliverability over volume.

/** Lifetime cap on COLD INVITE emails per prospect (vs MAX_OUTREACH_EMAILS for lead nudges). */
export const INVITE_MAX_EMAILS = 2

/** Days to wait before the single invite follow-up (only if they haven't signed up). */
export const INVITE_FOLLOWUP_DAYS = 4

/**
 * Verified roofers covering a city's centroid at/above which we consider the area
 * "covered" and stop proactively sweeping it. Higher than INDEX_MIN_PROS (=1, the
 * SEO bar) because liquidity needs a few competing roofers, not just one.
 */
export const COVERAGE_TARGET_PROS = 5

/** Don't re-sweep the same area until this many days pass (rotation, saves Places quota). */
export const ROTATE_DAYS = 14

/** How many areas the daily sweep discovers per run. */
export const SWEEP_AREAS_PER_DAY = 4

// ── Lead catch-up + stale-lead expiry ─────────────────────────────────────────

/**
 * How recent an open awaiting-coverage lead must be for the daily lead catch-up
 * to keep emailing reachable roofers about it. Matches the window a newly-eligible
 * roofer is auto-matched over, so we stop chasing supply for demand that's gone stale.
 */
export const RECRUIT_LEAD_MAX_AGE_DAYS = 21

/**
 * After this many days with no roofer, an awaiting-coverage lead is honestly
 * expired and the homeowner is told (rather than left on "we're matching you"
 * forever). Must be > RECRUIT_LEAD_MAX_AGE_DAYS so the two windows never overlap.
 */
export const RECRUIT_LEAD_EXPIRE_DAYS = 30

export function searchTermForService(serviceSlug: string | null | undefined): string {
  if (!serviceSlug) return DEFAULT_SEARCH_TERM
  return RECRUITMENT_SEARCH_TERM[serviceSlug] ?? DEFAULT_SEARCH_TERM
}
