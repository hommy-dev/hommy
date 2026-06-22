// Blog read layer. Uses the plain Sanity client wrapped in `"use cache"` (per
// CLAUDE.md — cacheComponents is on; do NOT use next-sanity's Live `sanityFetch`
// here, it sets fetch tags that require a use-cache scope yet also reads cookies,
// which conflict). Content is published-only and revalidates on the `standard`
// profile; future Studio webhooks can `updateTag('post')` / `updateTag('category')`.
import { cacheLife, cacheTag } from "next/cache";
import type { PortableTextBlock } from "next-sanity";

import { serverClient as client } from "@/sanity/server-client";
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
  cacheLife("standard");
  cacheTag("post");
  return (await client.fetch(POSTS_QUERY)) as PostCard[];
}

export async function getPostsByCategory(categorySlug: string): Promise<PostCard[]> {
  "use cache";
  cacheLife("standard");
  cacheTag("post", `category:${categorySlug}`);
  return (await client.fetch(POSTS_BY_CATEGORY_QUERY, { categorySlug })) as PostCard[];
}

export async function getCategories(): Promise<CategoryItem[]> {
  "use cache";
  cacheLife("standard");
  cacheTag("category");
  return (await client.fetch(CATEGORIES_QUERY)) as CategoryItem[];
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  "use cache";
  cacheLife("standard");
  cacheTag("post", `post:${slug}`);
  return (await client.fetch(POST_QUERY, { slug })) as BlogPost | null;
}

export async function getPostSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("standard");
  cacheTag("post");
  const rows = (await client.fetch(POST_SLUGS_QUERY)) as { slug: string }[];
  return rows.filter((r) => r.slug).map((r) => r.slug);
}
