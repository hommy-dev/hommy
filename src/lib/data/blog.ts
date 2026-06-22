// Blog read layer.
//
// Page-render reads use next-sanity's Live `sanityFetch` INSIDE `"use cache"`
// functions (cacheComponents is on). In that scope `sanityFetch` auto-tags the
// result with Sanity syncTags and sets a long `cacheLife`; `<SanityLive />`
// (root layout) streams content changes and revalidates those tags — real-time
// updates with no webhook. `sanityFetch` must NOT be called outside `"use cache"`.
//
// `generateStaticParams` runs at build (not a cache scope), so it uses the plain
// authed client directly. The dataset is private, hence the tokened clients.
import type { PortableTextBlock } from "next-sanity";

import { client } from "@/sanity/client";
import { sanityFetch } from "@/sanity/live";
import {
  POSTS_QUERY,
  POSTS_BY_CATEGORY_QUERY,
  CATEGORIES_QUERY,
  POST_QUERY,
  POST_SLUGS_QUERY,
} from "@/sanity/queries";
import type { PostCard, CategoryItem } from "@/components/blog/types";
import type { SanityImageValue } from "@/components/blog/sanity-image";

export type BlogAuthor = {
  name?: string;
  role?: string | null;
  bio?: string | null;
  image?: SanityImageValue;
  socialLinks?: { _key: string; platform: string; url: string }[] | null;
};

export type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  eyebrow?: string | null;
  excerpt?: string | null;
  publishedAt?: string | null;
  readTime?: number | null;
  mainImage?: SanityImageValue;
  category?: { _id: string; title: string; slug: string } | null;
  author?: BlogAuthor | null;
  body?: PortableTextBlock[] | null;
  seo?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    noIndex?: boolean | null;
    ogImage?: SanityImageValue;
  } | null;
  relatedPosts?: PostCard[] | null;
};

export async function getPosts(): Promise<PostCard[]> {
  "use cache";
  const { data } = await sanityFetch({ query: POSTS_QUERY });
  return (data ?? []) as PostCard[];
}

export async function getPostsByCategory(categorySlug: string): Promise<PostCard[]> {
  "use cache";
  const { data } = await sanityFetch({
    query: POSTS_BY_CATEGORY_QUERY,
    params: { categorySlug },
  });
  return (data ?? []) as PostCard[];
}

export async function getCategories(): Promise<CategoryItem[]> {
  "use cache";
  const { data } = await sanityFetch({ query: CATEGORIES_QUERY });
  return (data ?? []) as CategoryItem[];
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  "use cache";
  const { data } = await sanityFetch({ query: POST_QUERY, params: { slug } });
  return (data ?? null) as BlogPost | null;
}

// Build-time only — plain fresh fetch (not Live, not cached). Public dataset, so
// tokenless; `useCdn: false` guarantees fresh slugs for generateStaticParams.
export async function getPostSlugs(): Promise<string[]> {
  const rows = (await client
    .withConfig({ useCdn: false })
    .fetch(POST_SLUGS_QUERY)) as { slug: string }[];
  return rows.filter((r) => r.slug).map((r) => r.slug);
}
