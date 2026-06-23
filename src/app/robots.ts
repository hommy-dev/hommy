import type { MetadataRoute } from "next";
import { SITE_INDEXABLE } from "@/lib/seo";

// Pre-launch: disallow all crawling. At launch, flip SITE_INDEXABLE in
// src/lib/seo.ts (and add a sitemap reference here if desired).
export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXABLE) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return { rules: [{ userAgent: "*", allow: "/" }] };
}
