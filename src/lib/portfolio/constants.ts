// Client-safe portfolio constants. Kept out of `@/lib/data/portfolio` (which
// imports the DB) so client components can read them without pulling server-only
// modules (fs/net/tls) into the browser bundle.

/** Max images allowed inside a single case study (all plans). */
export const MAX_IMAGES_PER_PROJECT = 12
