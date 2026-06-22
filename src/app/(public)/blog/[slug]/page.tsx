import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import type { PortableTextBlock } from "next-sanity";

import { urlFor } from "@/sanity/image";
import { getPost, getPostSlugs } from "@/lib/data/blog";
import { BlogPortableText } from "@/components/blog/portable-text";
import { SanityImage } from "@/components/blog/sanity-image";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { PostCard } from "@/components/blog/post-card";
import { extractHeadings } from "@/components/blog/headings";

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const title = post.seo?.metaTitle ?? post.title;
  const description = post.seo?.metaDescription ?? post.excerpt ?? undefined;
  const ogSource = post.seo?.ogImage?.asset ? post.seo.ogImage : post.mainImage;
  const ogImage = ogSource?.asset
    ? urlFor(ogSource).width(1200).height(630).fit("crop").url()
    : undefined;

  return {
    title,
    description,
    robots: post.seo?.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      type: "article",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  // Generated body is a precise block union; the PortableText renderer takes the
  // generic PortableTextBlock[] shape, so bridge it once here.
  const body = (post.body ?? []) as unknown as PortableTextBlock[];
  const headings = extractHeadings(body);
  const related = (post.relatedPosts ?? []).filter(Boolean);

  const metaLine = [
    post.publishedAt && format(new Date(post.publishedAt), "MMMM d, yyyy"),
    post.readTime && `${post.readTime} min read`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-8 lg:px-10 lg:pt-12">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/blog" className="hover:text-foreground">
          Journal
        </Link>
        {post.category && (
          <>
            <span aria-hidden>/</span>
            <Link href={`/blog?category=${post.category.slug}`} className="hover:text-foreground">
              {post.category.title}
            </Link>
          </>
        )}
      </nav>

      {/* Header */}
      <header className="mx-auto max-w-3xl text-center">
        {post.eyebrow && (
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            {post.eyebrow}
          </p>
        )}
        <h1 className="font-sebenta text-3xl font-bold leading-tight tracking-tight text-foreground lg:text-5xl">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
          {post.author?.image?.asset && (
            <span className="relative size-9 overflow-hidden rounded-full bg-muted">
              <SanityImage value={post.author.image} alt={post.author.name ?? ""} fill sizes="36px" />
            </span>
          )}
          <div className="text-left">
            {post.author?.name && <p className="font-medium text-foreground">{post.author.name}</p>}
            {metaLine && <p>{metaLine}</p>}
          </div>
        </div>
      </header>

      {/* Cover */}
      {post.mainImage?.asset && (
        <div className="relative mx-auto mt-10 aspect-[16/9] max-w-4xl overflow-hidden rounded-2xl border border-border bg-muted">
          <SanityImage
            value={post.mainImage}
            alt={post.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 896px"
          />
        </div>
      )}

      {/* Body + TOC */}
      <div className="mt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
        <article className="mx-auto w-full max-w-2xl text-[1.0625rem] lg:mx-0">
          <BlogPortableText value={body} />
        </article>
        {headings.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents headings={headings} />
            </div>
          </aside>
        )}
      </div>

      {/* Author bio */}
      {post.author?.bio && (
        <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            {post.author.image?.asset && (
              <span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-muted">
                <SanityImage value={post.author.image} alt={post.author.name ?? ""} fill sizes="56px" />
              </span>
            )}
            <div>
              <p className="font-sebenta text-lg font-bold text-foreground">{post.author.name}</p>
              {post.author.role && (
                <p className="text-sm text-muted-foreground">{post.author.role}</p>
              )}
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{post.author.bio}</p>
            </div>
          </div>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 font-sebenta text-2xl font-bold tracking-tight text-foreground">
            Related articles
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <PostCard key={p._id} post={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
