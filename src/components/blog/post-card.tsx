import Link from "next/link";
import { format } from "date-fns";

import { SanityImage } from "./sanity-image";
import type { PostCard as PostCardData } from "./types";

/**
 * Clean blog card: image, a category · date line, and the title — nothing else.
 * The whole card links to the post (via the title's overlay); the category chip
 * sits above that overlay so it can route to its own filter.
 */
export function PostCard({ post, priority }: { post: PostCardData; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col">
      <Link
        href={`/blog/${post.slug}`}
        aria-label={post.title}
        className="relative block aspect-video overflow-hidden rounded-lg lg:rounded-[0.556vw] bg-muted ring-1 ring-foreground/10"
      >
        <SanityImage
          value={post.mainImage}
          alt={post.title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="transition-transform duration-500 group-hover:scale-105"
        />
      </Link>

      <div className="mt-4 lg:mt-[1.111vw] flex items-center justify-between gap-3 lg:gap-[0.833vw] text-[11px] lg:text-[0.764vw] font-semibold uppercase tracking-wide">
        {post.category ? (
          <Link
            href={`/blog?category=${post.category.slug}`}
            className="relative z-10 text-primary hover:underline"
          >
            {post.category.title}
          </Link>
        ) : (
          <span />
        )}
        {post.publishedAt && (
          <span className="text-muted-foreground">
            {format(new Date(post.publishedAt), "MMM d, yyyy")}
          </span>
        )}
      </div>

      <h3 className="mt-2 lg:mt-[0.556vw] font-sebenta text-lg lg:text-[1.389vw] font-bold leading-snug tracking-tight text-foreground">
        <Link
          href={`/blog/${post.slug}`}
          className="transition-colors after:absolute after:inset-0 hover:text-primary"
        >
          {post.title}
        </Link>
      </h3>
    </article>
  );
}
