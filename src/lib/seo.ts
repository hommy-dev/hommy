// Master SEO switch + shared site constants.
//
// PRE-LAUNCH: keep the entire site OUT of search engines (no indexing, no
// crawling). Both the global <meta name="robots"> (root layout) and the
// generated /robots.txt read SITE_INDEXABLE.
//
// AT LAUNCH: flip SITE_INDEXABLE to `true` (one change) to allow indexing. Make
// sure the sitemap, canonical tags, and structured data below are all in place
// before flipping.
//
// ENABLED 2026-06-30: site is now crawlable. Per-page coverage gates
// (INDEX_MIN_PROS) still keep thin/uncovered city pages noindex until a verified
// roofer covers them — so only real, populated pages get indexed.
export const SITE_INDEXABLE = true

/** Brand / site name, used in metadata and structured data. */
export const SITE_NAME = "Hommy"

/**
 * Canonical production origin. Set NEXT_PUBLIC_SITE_URL in prod
 * (e.g. https://www.hommy.online). Falls back to localhost for dev.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hommy.online"

/** Default social share image (1200x630), resolved against SITE_URL. */
export const OG_IMAGE = "/bg/seo-background.jpg"

/** Public contact channels — shared by the footer and Organization structured data. */
export const SITE_EMAIL = "contact@hommy.online"
export const SITE_PHONE = "+923147651112"

/**
 * Official brand social profiles. Used both for the footer social row and the
 * Organization `sameAs` array (entity recognition / knowledge graph). `icon`
 * matches a brand SVG in /public/icons.
 */
export const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://www.instagram.com/hommy.online/", icon: "instagram" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/hommymarketplace/", icon: "linkedin" },
  { label: "YouTube", href: "https://www.youtube.com/@Hommy-marketplace", icon: "youtube" },
  { label: "Facebook", href: "https://www.facebook.com/share/1DL5wTk7ZF/", icon: "facebook" },
] as const

/** Founder — linked (via LinkedIn) for entity recognition in Organization schema. */
export const SITE_FOUNDER = {
  name: "Haseeb Ahmed Raza Khan",
  linkedin: "https://www.linkedin.com/in/haseeb-ahmed-raza-khan",
} as const

/** Build an absolute URL for a path against SITE_URL. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString()
}
