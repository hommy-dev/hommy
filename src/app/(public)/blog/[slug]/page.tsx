import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import type { PortableTextBlock } from "next-sanity";

import { urlFor } from "@/sanity/image";
import { getPost, getPostSlugs } from "@/lib/data/blog";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";
import { JsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";
import { BlogPortableText } from "@/components/blog/portable-text";
import { SanityImage } from "@/components/blog/sanity-image";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { PostCard } from "@/components/blog/post-card";
import { ShareRail } from "@/components/blog/share-rail";
import { BlogCta } from "@/components/blog/blog-cta";
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
    alternates: { canonical: `/blog/${slug}` },
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

  const canonicalUrl = absoluteUrl(`/blog/${slug}`);
  const heroImage = post.mainImage?.asset
    ? urlFor(post.mainImage).width(1200).height(630).fit("crop").url()
    : undefined;
  const breadcrumbItems = [
    { name: "Home", url: absoluteUrl("/") },
    { name: "Journal", url: absoluteUrl("/blog") },
    { name: post.title, url: canonicalUrl },
  ];

  const metaLine = [
    post.publishedAt && format(new Date(post.publishedAt), "MMMM d, yyyy"),
    post.readTime && `${post.readTime} min read`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto lg:max-w-[90vw] px-5 pb-24 pt-28 lg:px-[1.389vw] lg:pb-[6.667vw] lg:pt-[7vw]">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          ...(post.excerpt ? { description: post.excerpt } : {}),
          ...(heroImage ? { image: [heroImage] } : {}),
          ...(post.publishedAt
            ? { datePublished: post.publishedAt, dateModified: post.publishedAt }
            : {}),
          ...(post.author?.name
            ? { author: { "@type": "Person", name: post.author.name } }
            : {}),
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            logo: { "@type": "ImageObject", url: absoluteUrl("/logo/logo.png") },
          },
          mainEntityOfPage: canonicalUrl,
        }}
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground lg:mb-[2vw] lg:gap-[0.556vw] lg:text-[0.903vw]" aria-label="Breadcrumb">
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

      {/* Hero — two columns: title + meta on the left, cover on the right */}
      <header className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-[3.5vw]">
        <div>
          <h1 className="font-sebenta text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-[3.05vw]">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground lg:mt-[1.2vw] lg:text-[1.18vw]">
              {post.excerpt}
            </p>
          )}
          <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground lg:mt-[1.8vw] lg:gap-[0.833vw] lg:text-[0.903vw]">
            {post.author?.image?.asset && (
              <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted lg:size-[2.8vw]">
                <SanityImage value={post.author.image} alt={post.author.name ?? ""} fill sizes="44px" />
              </span>
            )}
            <div>
              {post.author?.name && <p className="font-semibold text-foreground">{post.author.name}</p>}
              {metaLine && <p>{metaLine}</p>}
            </div>
          </div>
        </div>

        {post.mainImage?.asset && (
          <div className="relative aspect-video overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10 lg:rounded-[0.556vw]">
            <SanityImage
              value={post.mainImage}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
          </div>
        )}
      </header>

      {/* Body — share rail pinned left, article fills the middle, TOC + CTA pinned right */}
      <div className="mt-12 lg:mt-[4.5vw] lg:flex lg:gap-[3.5vw]">
        <aside className="hidden shrink-0 lg:block">
          <div className="sticky top-[4vw]">
            <ShareRail direction="vertical" />
          </div>
        </aside>

        <article className="mx-auto w-full max-w-2xl text-[1.0625rem] lg:mx-0 lg:max-w-none lg:flex-1 lg:text-[1.1vw]">
          <BlogPortableText value={body} />
        </article>

        <aside className="hidden shrink-0 lg:block lg:w-[20vw]">
          <div className="sticky top-[4vw] space-y-[1.5vw]">
            {headings.length > 0 && <TableOfContents headings={headings} />}
            <BlogCta />
          </div>
        </aside>

        {/* Mobile: share + CTA below the article */}
        <div className="mt-12 space-y-8 lg:hidden">
          <ShareRail direction="horizontal" />
          <BlogCta />
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-20 lg:mt-[5.556vw]">
          <h2 className="mb-6 font-sebenta text-2xl font-bold tracking-tight text-foreground lg:mb-[1.667vw] lg:text-[1.944vw]">
            You may also like
          </h2>
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-[1.667vw] lg:gap-y-[2.778vw]">
            {related.map((p) => (
              <PostCard key={p._id} post={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
