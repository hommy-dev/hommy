import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStateWithCities } from "@/lib/data/locations";
import { getRoofersDirectory } from "@/lib/data/roofers";
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/seo";
import { ogImageMeta } from "@/lib/og";
import { BreadcrumbJsonLd } from "@/components/seo/structured-data";
import { RoofingHero } from "@/components/roofing/roofing-hero";
import { RoofersDirectory } from "@/components/roofing/roofers-directory";
import { RoofingLocationCard } from "@/components/roofing/roofing-location-card";
import { RoofingEmpty } from "@/components/roofing/roofing-empty";
import { RoofingPageSections } from "@/components/roofing/roofing-page-sections";

// State hubs render on-demand (no generateStaticParams): the operating-state set
// is DB-driven and can be empty (e.g. unseeded prod), which cacheComponents
// disallows for prerender. Matches the [city]/[subtype] pages. Unknown state
// slugs fall through to notFound() below.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state } = await params;
  const data = await getStateWithCities(state);
  if (!data) return {};
  const title = `Roofing contractors in ${data.state.name}`;
  return {
    title,
    description: `Find licensed, insured roofers across ${data.state.name}. Browse roofing contractors by city and get free quotes on Hommy.`,
    alternates: { canonical: `/roofing/${state}` },
    // Thin hub (no indexable cities yet) stays out of the index.
    robots: SITE_INDEXABLE && data.totalIndexable > 0 ? undefined : { index: false, follow: true },
    ...ogImageMeta({
      title: `Roofers across ${data.state.name}`,
      kicker: "Roofing",
      stats: [
        ...(data.totalIndexable > 0
          ? [{ value: String(data.totalIndexable), label: "Cities covered" }]
          : []),
        { value: "Free", label: "To get quotes" },
        { value: "0", label: "Spam calls" },
      ],
    }),
  };
}

export default async function StateHubPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const data = await getStateWithCities(state);
  if (!data) notFound();

  const quoteHref = `/get-a-quote?where=${encodeURIComponent(data.state.name)}`;
  const dir = await getRoofersDirectory({ stateSlug: state, page: 0, pageSize: 12 });

  return (
    <>
    <div className="mx-auto px-5 pb-10 pt-28 lg:max-w-[95vw] lg:px-[1.389vw] lg:pb-[2vw] lg:pt-[10vw]">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: absoluteUrl("/") },
          { name: "Roofing", url: absoluteUrl("/roofing") },
          { name: data.state.name, url: absoluteUrl(`/roofing/${state}`) },
        ]}
      />

      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground lg:mb-[1.5vw] lg:gap-[0.4vw] lg:text-[0.903vw]" aria-label="Breadcrumb">
        <Link href="/roofing" className="hover:text-foreground">
          Roofing
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{data.state.name}</span>
      </nav>

      <RoofingHero
        title={`Roofing contractors in ${data.state.name}`}
        intro={`Licensed, insured, background-checked roofers serving ${data.state.name}. Free to post, no spam calls, and you only hear from the pros you choose.`}
        ctaHref={quoteHref}
      />

      {/* Companies first — the directory scoped to this state */}
      {dir.total > 0 && (
        <section className="mt-12 lg:mt-[3.5vw]">
          <RoofersDirectory
            initialItems={dir.items}
            initialTotal={dir.total}
            initialHasMore={dir.hasMore}
            scope={{ stateSlug: state, placeLabel: data.state.name }}
            quoteHref={quoteHref}
          />
        </section>
      )}

      {/* Browse by city */}
      {data.cities.length > 0 && (
        <section className="mt-14 lg:mt-[4vw]">
          <h2 className="font-sebenta text-2xl font-semibold tracking-tight text-foreground lg:text-[1.944vw]">
            Browse roofers by city
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-[1.667vw] lg:grid-cols-4 lg:gap-[1.111vw]">
            {data.cities.map((c) => (
              <RoofingLocationCard
                key={c.slug}
                href={`/roofing/${state}/${c.slug}`}
                name={c.name}
                count="View roofers"
              />
            ))}
          </div>
        </section>
      )}

      {/* Nothing yet */}
      {dir.total === 0 && data.cities.length === 0 && (
        <div className="mt-10 lg:mt-[3vw]">
          <RoofingEmpty
            message={`We're adding roofers across ${data.state.name} now. Post your job for free and we'll match you with local pros as they join.`}
            href="/get-a-quote"
          />
        </div>
      )}

    </div>
    <RoofingPageSections
      ctaTitle={`Let's get your ${data.state.name} roof sorted.`}
      ctaBody="Post your job for free and compare quotes from local, vetted roofers."
      ctaHref="/get-a-quote"
      ctaLabel="Post a job"
    />
    </>
  );
}
