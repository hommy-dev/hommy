import createImageUrlBuilder from "@sanity/image-url";

import { dataset, projectId } from "./env";

const builder = createImageUrlBuilder({ projectId, dataset });

// Derive the source type from the builder so we don't depend on a deep
// internal import path (which moved between @sanity/image-url versions).
export function urlFor(source: Parameters<typeof builder.image>[0]) {
  return builder.image(source);
}
