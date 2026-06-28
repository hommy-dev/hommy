// SEO / programmatic-location-page tuning. Static config (no DB) so it can be
// imported anywhere — pages, data layer, sitemap. See docs/SEO_STRATEGY plan and
// src/lib/data/locations.ts for how these gate indexability.
//
// Launch states come from src/lib/config/service-areas.ts (OPERATING_STATES) —
// do NOT redefine them here.

/**
 * Min verified roofers whose service area covers a city before its page is
 * INDEXABLE (listed in the sitemap, no `noindex`). Below this the page still
 * renders for users but is kept out of search — the thin-content guardrail.
 * Set to 1: a city starts ranking as soon as a single covering roofer exists.
 */
export const INDEX_MIN_PROS = 1

/** Max roofer cards rendered on a single city page. */
export const CITY_PRO_LIMIT = 12

/** Max cities listed on a state hub before a "view all" affordance. */
export const STATE_HUB_CITY_LIMIT = 60

/** Recency window (days) for a city's "recent requests" demand signal. */
export const DEMAND_WINDOW_DAYS = 90
