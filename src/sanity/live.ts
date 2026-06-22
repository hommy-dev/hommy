// Live Content API — real-time content + Visual Editing.
// Requires <SanityLive /> to be rendered in the root layout.
import { defineLive } from "next-sanity/live";

import { client } from "./client";

export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({
    // Live Content requires a recent API version.
    apiVersion: "2026-06-01",
  }),
  // Optional — only needed to preview drafts (Presentation tool / Visual Editing).
  // Create one at https://www.sanity.io/manage (Viewer role) and set SANITY_API_READ_TOKEN.
  serverToken: process.env.SANITY_API_READ_TOKEN,
  browserToken: process.env.SANITY_API_READ_TOKEN,
});
