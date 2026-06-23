// Master SEO switch.
//
// PRE-LAUNCH: keep the entire site OUT of search engines (no indexing, no
// crawling). Both the global <meta name="robots"> (root layout) and the
// generated /robots.txt read this flag.
//
// AT LAUNCH: flip SITE_INDEXABLE to `true` (one change) to allow indexing.
export const SITE_INDEXABLE = false
