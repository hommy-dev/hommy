// Reusable JSON-LD structured-data helpers. Renders schema.org markup as
// <script type="application/ld+json">. Keep the data honest — only emit fields
// that are actually true (e.g. don't fake ratings/review counts).

import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo"

/** Renders a JSON-LD <script>. `<` is escaped so the JSON can't break out of the tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}

/** Organization identity — render once, sitewide (home page). */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl("/logo/logo.png"),
        description:
          "Hommy connects homeowners with licensed and insured local roofers.",
      }}
    />
  )
}

/** WebSite entity — render once on the home page. */
export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      }}
    />
  )
}

/** Breadcrumb trail. Pass ordered { name, url } items (absolute URLs). */
export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  )
}
