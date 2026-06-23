import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getRooferBySlug } from "@/lib/data/roofers";
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/seo";
import { ogImageMeta } from "@/lib/og";
import { JsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";

// Render on-demand (no generateStaticParams): the verified set can be empty,
// which cacheComponents disallows for prerender. Unknown/unverified → notFound().

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const roofer = await getRooferBySlug(slug);
  if (!roofer) return {};
  const name = roofer.companyName ?? "Roofing contractor";
  // Only emit stats that are real — never fabricate ratings/reviews.
  const stats = [
    ...(roofer.avgRating
      ? [{ value: `${roofer.avgRating.toFixed(1)}★`, label: "Avg rating" }]
      : []),
    ...(roofer.totalReviews > 0
      ? [{ value: String(roofer.totalReviews), label: "Reviews" }]
      : []),
    ...(roofer.cities.length > 0
      ? [{ value: String(roofer.cities.length), label: "Service areas" }]
      : []),
  ];
  return {
    title: `${name} — Roofing Contractor`,
    description:
      roofer.bio?.slice(0, 155) ??
      `${name} is a licensed, insured roofing contractor on Hommy. See reviews, service areas, and get a free quote.`,
    alternates: { canonical: `/roofers/${slug}` },
    robots: SITE_INDEXABLE ? undefined : { index: false, follow: true },
    ...ogImageMeta({
      title: name,
      kicker: "Verified roofing contractor",
      stats,
    }),
  };
}

export default async function RooferProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const roofer = await getRooferBySlug(slug);
  if (!roofer) notFound();

  const name = roofer.companyName ?? "Roofing contractor";
  const quoteHref = "/get-a-quote";
  const hasRating = roofer.avgRating != null && roofer.totalReviews > 0;

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-12 lg:pt-16">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: absoluteUrl("/") },
          { name: "Roofing", url: absoluteUrl("/roofing") },
          { name, url: absoluteUrl(`/roofers/${slug}`) },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "RoofingContractor",
          name,
          url: absoluteUrl(`/roofers/${slug}`),
          ...(roofer.logoUrl ? { image: roofer.logoUrl } : {}),
          ...(roofer.bio ? { description: roofer.bio } : {}),
          ...(roofer.cities.length > 0
            ? { areaServed: roofer.cities.map((c) => ({ "@type": "City", name: c.name })) }
            : {}),
          // Only emit a rating when it's real — never fabricate.
          ...(hasRating
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: roofer.avgRating!.toFixed(1),
                  reviewCount: roofer.totalReviews,
                },
              }
            : {}),
        }}
      />

      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/roofing" className="hover:text-foreground">Roofing</Link>
        <span aria-hidden> / </span>
        <span className="text-foreground">{name}</span>
      </nav>

      {/* Header */}
      <header className="flex items-start gap-5">
        {roofer.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary contractor logo URL
          <img src={roofer.logoUrl} alt={name} className="size-20 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="size-20 shrink-0 rounded-2xl bg-muted" />
        )}
        <div className="min-w-0">
          <h1 className="font-sebenta text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            {name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium text-primary">✓ Verified, licensed &amp; insured</span>
            {hasRating && <span>★ {roofer.avgRating!.toFixed(1)} ({roofer.totalReviews})</span>}
            {roofer.yearsInBusiness ? <span>{roofer.yearsInBusiness} yrs in business</span> : null}
            {roofer.licenseNumber ? <span>License {roofer.licenseNumber}</span> : null}
          </p>
          <Link
            href={quoteHref}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-background"
          >
            Get a free quote
          </Link>
        </div>
      </header>

      {/* Bio */}
      {roofer.bio && (
        <section className="mt-10 max-w-2xl">
          <h2 className="font-sebenta text-2xl font-bold text-foreground">About {name}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{roofer.bio}</p>
        </section>
      )}

      {/* Service areas → city pages (internal links) */}
      {roofer.cities.length > 0 && (
        <section className="mt-10">
          <h2 className="font-sebenta text-2xl font-bold text-foreground">Areas served</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {roofer.cities.map((c) => (
              <li key={`${c.stateSlug}/${c.citySlug}`}>
                <Link
                  href={`/roofing/${c.stateSlug}/${c.citySlug}`}
                  className="inline-block rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary/40"
                >
                  {c.name}, {c.stateCode}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Reviews */}
      {roofer.reviews.length > 0 && (
        <section className="mt-10">
          <h2 className="font-sebenta text-2xl font-bold text-foreground">Reviews</h2>
          <ul className="mt-4 space-y-4">
            {roofer.reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{r.reviewerName ?? "Verified homeowner"}</span>
                  <span className="text-sm text-muted-foreground">★ {r.rating}</span>
                </div>
                {r.comment && <p className="mt-2 text-muted-foreground">{r.comment}</p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  {format(new Date(r.submittedAt), "MMMM yyyy")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CTA */}
      <section className="mt-14 rounded-2xl border border-border bg-card p-8 text-center">
        <p className="font-sebenta text-2xl font-bold text-foreground">Want a quote from {name}?</p>
        <p className="mt-2 text-muted-foreground">
          Post your roofing job on Hommy — it&apos;s free, and you choose who you talk to.
        </p>
        <Link href={quoteHref} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3 font-medium text-background">
          Get a free quote
        </Link>
      </section>
    </div>
  );
}
