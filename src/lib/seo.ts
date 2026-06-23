// Master SEO switch + shared site constants.
//
// PRE-LAUNCH: keep the entire site OUT of search engines (no indexing, no
// crawling). Both the global <meta name="robots"> (root layout) and the
// generated /robots.txt read SITE_INDEXABLE.
//
// AT LAUNCH: flip SITE_INDEXABLE to `true` (one change) to allow indexing. Make
// sure the sitemap, canonical tags, and structured data below are all in place
// before flipping.
export const SITE_INDEXABLE = false

/** Brand / site name, used in metadata and structured data. */
export const SITE_NAME = "Hommy"

/**
 * Canonical production origin. Set NEXT_PUBLIC_SITE_URL in prod
 * (e.g. https://www.hommy.online). Falls back to localhost for dev.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

/** Default social share image (1200x630), resolved against SITE_URL. */
export const OG_IMAGE = "/bg/landing-page-hero.jpeg"

/** Build an absolute URL for a path against SITE_URL. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString()
}
