import "server-only";

import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "./env";

/**
 * Server-only authenticated read client. The production dataset is private, so
 * reads must carry a token. This module is `server-only`, so the token is never
 * bundled into client code. Used by the blog read layer (src/lib/data/blog.ts).
 *
 * `useCdn` is false because the API CDN cannot be combined with a token; the
 * `"use cache"` boundary in the data layer provides the caching instead.
 */
export const serverClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
  perspective: "published",
});
