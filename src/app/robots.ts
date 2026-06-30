import type { MetadataRoute } from "next";
import { SITE_INDEXABLE, absoluteUrl } from "@/lib/seo";

// Pre-launch: disallow all crawling. At launch, flip SITE_INDEXABLE in
// src/lib/seo.ts to allow indexing; the sitemap reference is already wired below.
export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXABLE) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private app surfaces + infra out of the index.
        disallow: [
          "/api/",
          "/auth/",
          "/onboarding/",
          "/admin/",
          "/contractor/",
          "/homeowner/",
          "/accept/",
          "/review/",
          // Token / personalized + non-content pages — never index these.
          "/claim/",
          "/invite/",
          "/unsubscribe",
          "/sandbox",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
