// Live Content API — real-time content via Next.js Cache Components.
// Requires <SanityLive /> in the root layout and `cacheComponents: true` in
// next.config. `sanityFetch` must be called inside a `"use cache"` function
// (see src/lib/data/blog.ts): there it auto-tags results with Sanity syncTags,
// and <SanityLive /> revalidates them on content change (no webhook needed).
//
// The production dataset is public, so published reads are tokenless and served
// from the CDN (fastest). The tokens below are only used for draft preview
// (Presentation / Visual Editing) when that is enabled later.
import { defineLive } from "next-sanity/live";

import { client } from "./client";

export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({ apiVersion: "2026-06-01" }),
  serverToken: process.env.SANITY_API_READ_TOKEN,
  browserToken: process.env.SANITY_API_READ_TOKEN,
});
