import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRooferBySlug } from "@/lib/data/roofers";
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/seo";
import { ogImageMeta } from "@/lib/og";
import { JsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";
import { Icon } from "@/components/ui/icon";
import { type ProfileStat } from "@/components/dashboard/profile/profile-header";
import { ContractorProfileView } from "@/components/contractors/contractor-profile-view";

// Render on-demand (no generateStaticParams): the verified set can be empty,
// which cacheComponents disallows for prerender. Unknown/unverified → notFound().

const monthYear = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const roofer = await getRooferBySlug(slug);
  if (!roofer) return {};
  const name = roofer.companyName ?? "Roofing contractor";
  const rating = roofer.reviews.avgRating;
  // Only emit stats that are real — never fabricate ratings/reviews.
  const stats = [
    ...(rating ? [{ value: `${rating.toFixed(1)}★`, label: "Avg rating" }] : []),
    ...(roofer.reviews.total > 0
      ? [{ value: String(roofer.reviews.total), label: "Reviews" }]
      : []),
    ...(roofer.cities.length > 0
      ? [{ value: String(roofer.cities.length), label: "Service areas" }]
      : []),
  ];
  return {
    title: `${name}, Roofing Contractor`,
    description:
      roofer.bio?.slice(0, 155) ??
      `${name} is a licensed, insured roofing contractor on Hommy. See reviews, past work, service areas, and get a free quote.`,
    alternates: { canonical: `/roofers/${slug}` },
    robots: SITE_INDEXABLE ? undefined : { index: false, follow: true },
    ...ogImageMeta({ title: name, kicker: "Verified roofing contractor", stats }),
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
  // Combined (Hommy + Google) rating for DISPLAY — matches the dashboard profile.
  const rating = roofer.reviews.avgRating;
  // AggregateRating schema uses the cached Hommy-native rating only.
  const hasNativeRating = roofer.nativeAvgRating != null && roofer.nativeTotalReviews > 0;

  const metaLine = [
    "Roofing",
    roofer.yearsInBusiness != null
      ? `${roofer.yearsInBusiness} year${roofer.yearsInBusiness === 1 ? "" : "s"} in business`
      : null,
    roofer.areas[0]?.label ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

  const stats: ProfileStat[] = [
    { label: "Rating", value: rating ? rating.toFixed(1) : "—", star: true },
    { label: roofer.reviews.total === 1 ? "Review" : "Reviews", value: String(roofer.reviews.total) },
    ...(roofer.yearsInBusiness != null
      ? [{ label: "Years", value: String(roofer.yearsInBusiness) } satisfies ProfileStat]
      : []),
    { label: roofer.wonCount === 1 ? "Job won" : "Jobs won", value: String(roofer.wonCount) },
  ];

  return (
    <div className="mx-auto px-5 pb-16 pt-28 lg:max-w-[80vw] lg:px-[1.389vw] lg:pb-[5vw] lg:pt-[7vw]">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: absoluteUrl("/") },
          { name: "Roofing companies", url: absoluteUrl("/roofers") },
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
          ...(hasNativeRating
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: roofer.nativeAvgRating!.toFixed(1),
                  reviewCount: roofer.nativeTotalReviews,
                },
              }
            : {}),
        }}
      />

      <nav
        className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground lg:mb-[1.5vw] lg:gap-[0.4vw] lg:text-[0.903vw]"
        aria-label="Breadcrumb"
      >
        <Link href="/roofers" className="hover:text-foreground">
          Roofing companies
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{name}</span>
      </nav>

      <ContractorProfileView
        name={name}
        verified={roofer.verified}
        logoUrl={roofer.logoUrl}
        metaLine={metaLine}
        stats={stats}
        bio={roofer.bio}
        portfolio={roofer.portfolio}
        googleMedia={roofer.googleMedia}
        reviews={roofer.reviews}
        subtypes={roofer.subtypes}
        areas={roofer.areas}
        memberSince={monthYear(roofer.createdAt)}
        canManage={false}
        editHref=""
        primaryCta={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:gap-[0.833vw]">
            <Link
              href={`/get-a-quote?for=${slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 lg:gap-[0.4vw] lg:rounded-[0.694vw] lg:px-[1.667vw] lg:py-[0.8vw] lg:text-[1.05vw]"
            >
              Request a quote from {name}
              <Icon name="arrow-right" className="size-5 lg:size-[1.2vw]" />
            </Link>
            <Link
              href={quoteHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold text-foreground ring-1 ring-foreground/15 transition-colors hover:ring-foreground/30 lg:gap-[0.4vw] lg:rounded-[0.694vw] lg:px-[1.667vw] lg:py-[0.8vw] lg:text-[1.05vw]"
            >
              Or post to all roofers
            </Link>
          </div>
        }
      />
    </div>
  );
}
