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
    <article className="hommy-lift group flex flex-col overflow-hidden rounded-2xl lg:rounded-[1.111vw] border border-border bg-card">
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
          <span className="absolute left-3 lg:left-[0.833vw] top-3 lg:top-[0.833vw] rounded-full bg-background/90 px-2.5 lg:px-[0.694vw] py-1 lg:py-[0.278vw] text-[11px] lg:text-[0.764vw] font-semibold uppercase tracking-wide text-foreground backdrop-blur">
            {post.eyebrow}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5 lg:p-[1.389vw]">
        <div className="mb-2 lg:mb-[0.556vw] flex items-center gap-2 lg:gap-[0.556vw] text-xs lg:text-[0.833vw] text-muted-foreground">
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
        <h3 className="font-sebenta text-lg lg:text-[1.25vw] font-bold leading-snug tracking-tight text-foreground">
          <Link href={`/blog/${post.slug}`} className="after:absolute hover:text-primary">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && (
          <p className="mt-2 lg:mt-[0.556vw] line-clamp-3 text-sm lg:text-[0.972vw] leading-6 lg:leading-[1.667vw] text-muted-foreground">{post.excerpt}</p>
        )}
        {post.author?.name && (
          <div className="mt-4 lg:mt-[1.111vw] flex items-center gap-2 lg:gap-[0.556vw] pt-1 lg:pt-[0.278vw] text-xs lg:text-[0.833vw] text-muted-foreground">
            {post.author.image?.asset && (
              <span className="relative size-6 lg:size-[1.667vw] overflow-hidden rounded-full bg-muted">
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
    <article className="hommy-lift group grid overflow-hidden rounded-3xl lg:rounded-[1.574vw] border border-border bg-card md:grid-cols-2">
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
      <div className="flex flex-col justify-center p-6 lg:p-[2.778vw]">
        <div className="mb-3 lg:mb-[0.833vw] flex items-center gap-2 lg:gap-[0.556vw] text-xs lg:text-[0.833vw] text-muted-foreground">
          <span className={cn("rounded-full bg-secondary px-2.5 lg:px-[0.694vw] py-1 lg:py-[0.278vw] text-[11px] lg:text-[0.764vw] font-semibold uppercase tracking-wide text-secondary-foreground")}>
            {post.eyebrow ?? "Featured"}
          </span>
          {post.category && <span className="font-medium text-primary">{post.category.title}</span>}
        </div>
        <h2 className="font-sebenta text-2xl font-bold leading-tight tracking-tight text-foreground lg:text-[2.5vw]">
          <Link href={`/blog/${post.slug}`} className="hover:text-primary">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && (
          <p className="mt-3 lg:mt-[0.833vw] max-w-prose text-muted-foreground lg:text-[1.25vw]">{post.excerpt}</p>
        )}
        <div className="mt-5 lg:mt-[1.389vw] text-sm lg:text-[0.972vw] text-muted-foreground">{meta(post)}</div>
      </div>
    </article>
  );
}
