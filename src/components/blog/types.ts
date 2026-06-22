import type { SanityImageValue } from "./sanity-image";

export type PostCard = {
  _id: string;
  title: string;
  slug: string;
  eyebrow?: string | null;
  excerpt?: string | null;
  publishedAt?: string | null;
  readTime?: number | null;
  featured?: boolean | null;
  mainImage?: SanityImageValue;
  category?: { _id: string; title: string; slug: string } | null;
  author?: { name: string; slug?: string | null; role?: string | null; image?: SanityImageValue } | null;
};

export type CategoryItem = {
  _id: string;
  title: string;
  slug: string;
  description?: string | null;
  postCount?: number;
};
