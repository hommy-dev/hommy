import Link from "next/link";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { SanityImage } from "./sanity-image";
import type { PostCard as PostCardData } from "./types";

function meta(post: PostCardData): string {
  const parts: string[] = [];
  if (post.publishedAt) parts.push(format(new Date(post.publishedAt), "MMM d, yyyy"));
  if (post.readTime) parts.push(`${post.readTime} min read`);
  return parts.join(" · ");
}

/** Standard post card for the blog grid. */
export function PostCard({ post, priority }: { post: PostCardData; priority?: boolean }) {
  return (
    <article className="hommy-lift group flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-muted">
        <SanityImage
          value={post.mainImage}
          alt={post.title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="transition-transform duration-500 group-hover:scale-105"
        />
        {post.eyebrow && (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground backdrop-blur">
            {post.eyebrow}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          {post.category && (
            <Link
              href={`/blog?category=${post.category.slug}`}
              className="font-medium text-primary hover:underline"
            >
              {post.category.title}
            </Link>
          )}
          {post.category && <span aria-hidden>·</span>}
          <span>{meta(post)}</span>
        </div>
        <h3 className="font-sebenta text-lg font-bold leading-snug tracking-tight text-foreground">
          <Link href={`/blog/${post.slug}`} className="after:absolute hover:text-primary">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
        )}
        {post.author?.name && (
          <div className="mt-4 flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            {post.author.image?.asset && (
              <span className="relative size-6 overflow-hidden rounded-full bg-muted">
                <SanityImage value={post.author.image} alt={post.author.name} fill sizes="24px" />
              </span>
            )}
            <span>{post.author.name}</span>
          </div>
        )}
      </div>
    </article>
  );
}

/** Large featured card used at the top of the index. */
export function FeaturedCard({ post }: { post: PostCardData }) {
  return (
    <article className="hommy-lift group grid overflow-hidden rounded-3xl border border-border bg-card md:grid-cols-2">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-muted md:aspect-auto">
        <SanityImage
          value={post.mainImage}
          alt={post.title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="transition-transform duration-500 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-col justify-center p-6 lg:p-10">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground")}>
            {post.eyebrow ?? "Featured"}
          </span>
          {post.category && <span className="font-medium text-primary">{post.category.title}</span>}
        </div>
        <h2 className="font-sebenta text-2xl font-bold leading-tight tracking-tight text-foreground lg:text-4xl">
          <Link href={`/blog/${post.slug}`} className="hover:text-primary">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && (
          <p className="mt-3 max-w-prose text-muted-foreground lg:text-lg">{post.excerpt}</p>
        )}
        <div className="mt-5 text-sm text-muted-foreground">{meta(post)}</div>
      </div>
    </article>
  );
}
