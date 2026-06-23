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
    <div className="mx-auto max-w-6xl lg:max-w-[80vw] px-5 pb-24 lg:pb-[6.667vw] pt-8 lg:px-[2.778vw] lg:pt-[3.333vw]">
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
      <nav className="mb-8 lg:mb-[2.222vw] flex items-center gap-2 lg:gap-[0.556vw] text-sm lg:text-[0.972vw] text-muted-foreground" aria-label="Breadcrumb">
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
      <header className="mx-auto max-w-3xl lg:max-w-[53.328vw] text-center">
        {post.eyebrow && (
          <p className="mb-3 lg:mb-[0.833vw] text-sm lg:text-[0.972vw] font-semibold uppercase tracking-widest text-primary">
            {post.eyebrow}
          </p>
        )}
        <h1 className="font-sebenta text-3xl font-bold leading-tight tracking-tight text-foreground lg:text-[3.333vw]">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mx-auto mt-4 lg:mt-[1.111vw] max-w-2xl lg:max-w-[46.662vw] text-lg lg:text-[1.25vw] text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="mt-6 lg:mt-[1.667vw] flex items-center justify-center gap-3 lg:gap-[0.833vw] text-sm lg:text-[0.972vw] text-muted-foreground">
          {post.author?.image?.asset && (
            <span className="relative size-9 lg:size-[2.5vw] overflow-hidden rounded-full bg-muted">
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
        <div className="relative mx-auto mt-10 lg:mt-[2.778vw] aspect-[16/9] max-w-4xl lg:max-w-[62.216vw] overflow-hidden rounded-2xl lg:rounded-[1.111vw] border border-border bg-muted">
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
      <div className="mt-12 lg:mt-[3.333vw] lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-[3.333vw]">
        <article className="mx-auto w-full max-w-2xl lg:max-w-[46.662vw] text-[1.0625rem] lg:text-[1.18vw] lg:mx-0">
          <BlogPortableText value={body} />
        </article>
        {headings.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-24 lg:top-[6.667vw]">
              <TableOfContents headings={headings} />
            </div>
          </aside>
        )}
      </div>

      {/* Author bio */}
      {post.author?.bio && (
        <div className="mx-auto mt-16 lg:mt-[4.444vw] max-w-2xl lg:max-w-[46.662vw] rounded-2xl lg:rounded-[1.111vw] border border-border bg-card p-6 lg:p-[1.667vw]">
          <div className="flex items-start gap-4 lg:gap-[1.111vw]">
            {post.author.image?.asset && (
              <span className="relative size-14 lg:size-[3.889vw] shrink-0 overflow-hidden rounded-full bg-muted">
                <SanityImage value={post.author.image} alt={post.author.name ?? ""} fill sizes="56px" />
              </span>
            )}
            <div>
              <p className="font-sebenta text-lg lg:text-[1.25vw] font-bold text-foreground">{post.author.name}</p>
              {post.author.role && (
                <p className="text-sm lg:text-[0.972vw] text-muted-foreground">{post.author.role}</p>
              )}
              <p className="mt-2 lg:mt-[0.556vw] text-sm lg:text-[0.972vw] leading-6 lg:leading-[1.667vw] text-muted-foreground">{post.author.bio}</p>
            </div>
          </div>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-20 lg:mt-[5.556vw]">
          <h2 className="mb-6 lg:mb-[1.667vw] font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight text-foreground">
            Related articles
          </h2>
          <div className="grid gap-6 lg:gap-[1.667vw] sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <PostCard key={p._id} post={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
