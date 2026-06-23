// Helpers for the dynamic social-share image route (src/app/og/route.tsx).
//
// Each SEO page builds an /og?… URL in its generateMetadata via ogImageUrl()
// (or spreads ogImageMeta() straight into the returned Metadata). Next resolves
// the relative path to an absolute URL against metadataBase (src/app/layout.tsx)
// when it renders <meta property="og:image">, so crawlers get a full URL.

export type OgStat = { value: string; label: string }

export type OgParams = {
  /** Headline rendered large, top-left. Required. */
  title: string
  /** Small uppercase eyebrow above the headline (e.g. "Roofing · Texas"). */
  kicker?: string
  /** Up to 3 stat blocks in the footer (big value + boxed caption). */
  stats?: OgStat[]
}

const OG_PATH = "/og"

/** Build the relative path to the OG image route for a page. */
export function ogImageUrl({ title, kicker, stats = [] }: OgParams): string {
  const sp = new URLSearchParams()
  sp.set("t", title)
  if (kicker) sp.set("k", kicker)
  for (const s of stats.slice(0, 3)) {
    if (s.value && s.label) sp.append("s", `${s.value}~${s.label}`)
  }
  return `${OG_PATH}?${sp.toString()}`
}

/**
 * Convenience block to spread into a page's Metadata. Sets both the Open Graph
 * and Twitter image to the dynamic card. 1200×630 is the standard share size.
 */
export function ogImageMeta(params: OgParams) {
  const url = ogImageUrl(params)
  return {
    openGraph: {
      images: [{ url, width: 1200, height: 630, alt: params.title }],
    },
    twitter: {
      card: "summary_large_image" as const,
      images: [url],
    },
  }
}
