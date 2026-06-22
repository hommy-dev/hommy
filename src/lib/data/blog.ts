// Blog read layer.
//
// Page-render reads use next-sanity's Live `sanityFetch` INSIDE `"use cache"`
// functions (cacheComponents is on). In that scope `sanityFetch` auto-tags the
// result with Sanity syncTags and sets a long `cacheLife`; `<SanityLive />`
// (root layout) streams content changes and revalidates those tags — real-time
// updates with no webhook. `sanityFetch` must NOT be called outside `"use cache"`.
//
// Return types come from TypeGen (src/sanity.types.ts) and are applied here, so
// every consumer (pages, components) gets fully-typed data. We apply the result
// type explicitly at this single boundary because the queries use interpolated
// GROQ fragments — that widens each query const to `string`, which defeats
// `overloadClientMethods`' literal-key auto-inference. The generated types are
// still the single source of truth (component prop types derive from them too).
//
// `generateStaticParams` runs at build (not a cache scope), so it uses the plain
// client directly. The dataset is public, so reads are tokenless.
import { client } from "@/sanity/client";
import { sanityFetch } from "@/sanity/live";
import {
  POSTS_QUERY,
  POSTS_BY_CATEGORY_QUERY,
  CATEGORIES_QUERY,
  POST_QUERY,
  POST_SLUGS_QUERY,
} from "@/sanity/queries";
import type {
  POSTS_QUERY_RESULT,
  POSTS_BY_CATEGORY_QUERY_RESULT,
  CATEGORIES_QUERY_RESULT,
  POST_QUERY_RESULT,
  POST_SLUGS_QUERY_RESULT,
} from "@/sanity.types";

/** A single fully-resolved blog post (non-null variant of POST_QUERY). */
export type BlogPost = NonNullable<POST_QUERY_RESULT>;

export async function getPosts(): Promise<POSTS_QUERY_RESULT> {
  "use cache";
  const { data } = await sanityFetch({ query: POSTS_QUERY });
  return data as POSTS_QUERY_RESULT;
}

export async function getPostsByCategory(
  categorySlug: string,
): Promise<POSTS_BY_CATEGORY_QUERY_RESULT> {
  "use cache";
  const { data } = await sanityFetch({
    query: POSTS_BY_CATEGORY_QUERY,
    params: { categorySlug },
  });
  return data as POSTS_BY_CATEGORY_QUERY_RESULT;
}

export async function getCategories(): Promise<CATEGORIES_QUERY_RESULT> {
  "use cache";
  const { data } = await sanityFetch({ query: CATEGORIES_QUERY });
  return data as CATEGORIES_QUERY_RESULT;
}

export async function getPost(slug: string): Promise<POST_QUERY_RESULT> {
  "use cache";
  const { data } = await sanityFetch({ query: POST_QUERY, params: { slug } });
  return data as POST_QUERY_RESULT;
}

// Build-time only — plain fresh fetch (not Live, not cached). Public dataset, so
// tokenless; `useCdn: false` guarantees fresh slugs for generateStaticParams.
export async function getPostSlugs(): Promise<string[]> {
  const rows = await client
    .withConfig({ useCdn: false })
    .fetch<POST_SLUGS_QUERY_RESULT>(POST_SLUGS_QUERY);
  return rows.flatMap((r) => (r.slug ? [r.slug] : []));
}
