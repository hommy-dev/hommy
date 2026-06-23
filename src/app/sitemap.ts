import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { getPostSlugs } from "@/lib/data/blog";
import { getIndexableCities, getStatesWithCounts } from "@/lib/data/locations";
import { getVerifiedRooferSlugs } from "@/lib/data/roofers";

// Generated sitemap. Lists the public, indexable routes + blog posts. As pSEO
// location pages land (/roofing/[state]/[city], /roofers/[slug]), add them here
// (use generateSitemaps() to shard if the URL count approaches Google's 50k cap).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/get-a-quote"), changeFrequency: "monthly", priority: 0.9 },
    { url: absoluteUrl("/blog"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/roofing"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
  ];

  let postRoutes: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getPostSlugs();
    postRoutes = slugs.map((slug) => ({
      url: absoluteUrl(`/blog/${slug}`),
      changeFrequency: "monthly",
      priority: 0.6,
    }));
  } catch {
    // Sanity unreachable at build — ship the static routes rather than fail.
  }

  let locationRoutes: MetadataRoute.Sitemap = [];
  try {
    const [statesWith, indexableCities, roofers] = await Promise.all([
      getStatesWithCounts(),
      getIndexableCities(),
      getVerifiedRooferSlugs(),
    ]);
    locationRoutes = [
      ...statesWith
        .filter((s) => s.indexableCityCount > 0)
        .map((s) => ({
          url: absoluteUrl(`/roofing/${s.slug}`),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        })),
      // Same indexability gate as the page's noindex toggle — they never disagree.
      ...indexableCities.map((c) => ({
        url: absoluteUrl(`/roofing/${c.stateSlug}/${c.citySlug}`),
        changeFrequency: "weekly" as const,
        priority: 0.7,
        lastModified: c.updatedAt,
      })),
      // Verified contractor profiles.
      ...roofers.map((r) => ({
        url: absoluteUrl(`/roofers/${r.slug}`),
        changeFrequency: "monthly" as const,
        priority: 0.6,
        lastModified: r.updatedAt,
      })),
    ];
  } catch {
    // DB unreachable at build — ship the rest rather than fail.
  }

  return [...staticRoutes, ...postRoutes, ...locationRoutes];
}
