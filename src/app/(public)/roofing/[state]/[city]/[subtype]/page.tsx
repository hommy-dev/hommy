import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCity,
  getCitySupplyForCity,
  getCitySubtypeSupply,
  getCityDemand,
} from "@/lib/data/locations";
import { getRoofingSubtypePage } from "@/lib/config/roofing-subtypes";
import { INDEX_MIN_PROS } from "@/lib/config/seo";
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/seo";
import { ogImageMeta } from "@/lib/og";
import { getRoofersDirectory } from "@/lib/data/roofers";
import { JsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";
import { Icon } from "@/components/ui/icon";
import { RoofingHero } from "@/components/roofing/roofing-hero";
import { RoofersDirectory } from "@/components/roofing/roofers-directory";
import { RoofingEmpty } from "@/components/roofing/roofing-empty";
import { RoofingPageSections } from "@/components/roofing/roofing-page-sections";

// On-demand (no generateStaticParams). Unknown city/subtype → notFound().

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string; subtype: string }>;
}): Promise<Metadata> {
  const { state, city, subtype } = await params;
  const sub = getRoofingSubtypePage(subtype);
  const cityRow = await getCity(state, city);
  if (!cityRow || !sub) return {};

  // Indexable only if the city itself clears the bar AND a pro offers this subtype.
  const [citySupply, subSupply] = await Promise.all([
    getCitySupplyForCity(state, city),
    getCitySubtypeSupply(state, city, sub.label),
  ]);
  const indexable =
    SITE_INDEXABLE && citySupply.proCount >= INDEX_MIN_PROS && subSupply.proCount >= 1;

  const title = `${sub.heading} in ${cityRow.name}, ${cityRow.stateCode}`;
  return {
    title,
    description: `Compare local, vetted roofers for ${sub.noun} in ${cityRow.name}, ${cityRow.stateName}. Free quotes, no spam calls, and you only hear from the roofers you choose.`,
    alternates: { canonical: `/roofing/${state}/${city}/${subtype}` },
    robots: indexable ? undefined : { index: false, follow: true },
    ...ogImageMeta({
      title,
      kicker: `${sub.heading} · ${cityRow.stateName}`,
      stats: [
        ...(subSupply.proCount > 0
          ? [{ value: String(subSupply.proCount), label: "Vetted roofers" }]
          : []),
        { value: "Free", label: "To get quotes" },
        { value: "0", label: "Spam calls" },
      ],
    }),
  };
}

export default async function CitySubtypePage({
  params,
}: {
  params: Promise<{ state: string; city: string; subtype: string }>;
}) {
  const { state, city, subtype } = await params;
  const sub = getRoofingSubtypePage(subtype);
  const cityRow = await getCity(state, city);
  if (!cityRow || !sub) notFound();

  const place = `${cityRow.name}, ${cityRow.stateCode}`;
  const quoteHref = `/get-a-quote?where=${encodeURIComponent(place)}`;
  const cityHref = `/roofing/${state}/${city}`;

  const [dir, demand] = await Promise.all([
    getRoofersDirectory({
      near: { lat: cityRow.lat, lng: cityRow.lng },
      subtype: sub.label,
      page: 0,
      pageSize: 12,
    }),
    getCityDemand(cityRow.stateCode, cityRow.name),
  ]);

  return (
    <>
    <div className="mx-auto px-5 pb-10 pt-28 lg:max-w-[95vw] lg:px-[1.389vw] lg:pb-[2vw] lg:pt-[10vw]">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: absoluteUrl("/") },
          { name: "Roofing", url: absoluteUrl("/roofing") },
          { name: cityRow.stateName, url: absoluteUrl(`/roofing/${state}`) },
          { name: cityRow.name, url: absoluteUrl(cityHref) },
          { name: sub.heading, url: absoluteUrl(`/roofing/${state}/${city}/${subtype}`) },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: `${sub.heading} (Roofing)`,
          areaServed: {
            "@type": "City",
            name: cityRow.name,
            containedInPlace: { "@type": "State", name: cityRow.stateName },
          },
          provider: { "@type": "Organization", name: "Hommy", url: absoluteUrl("/") },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: sub.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />

      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground lg:mb-[1.5vw] lg:gap-[0.4vw] lg:text-[0.903vw]" aria-label="Breadcrumb">
        <Link href="/roofing" className="hover:text-foreground">Roofing</Link>
        <span aria-hidden>/</span>
        <Link href={`/roofing/${state}`} className="hover:text-foreground">{cityRow.stateName}</Link>
        <span aria-hidden>/</span>
        <Link href={cityHref} className="hover:text-foreground">{cityRow.name}</Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{sub.heading}</span>
      </nav>

      <RoofingHero
        title={`${sub.heading} in ${cityRow.name}, ${cityRow.stateCode}`}
        intro={sub.intro(cityRow.name)}
        ctaHref={quoteHref}
        ctaLabel={`Get free ${sub.noun} quotes`}
        demand={
          demand.recentRequests > 0
            ? `${demand.recentRequests} ${demand.recentRequests === 1 ? "homeowner" : "homeowners"} asked for quotes here recently`
            : null
        }
      />

      {/* Companies offering this subtype — the directory scoped to city + service */}
      <section className="mt-12 lg:mt-[3.5vw]">
        {dir.total > 0 ? (
          <RoofersDirectory
            initialItems={dir.items}
            initialTotal={dir.total}
            initialHasMore={dir.hasMore}
            scope={{ near: { lat: cityRow.lat, lng: cityRow.lng }, placeLabel: place }}
            initialSubtype={sub.label}
            quoteHref={quoteHref}
          />
        ) : (
          <RoofingEmpty
            message={`We're adding roofers for ${sub.noun} in ${cityRow.name} now. Post your job for free and we'll match you with local roofers as they join.`}
            href={quoteHref}
          />
        )}
        <p className="mt-5 text-sm lg:mt-[1.2vw] lg:text-[0.903vw]">
          <Link href={cityHref} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline lg:gap-[0.3vw]">
            See all roofers in {cityRow.name}
            <Icon name="arrow-right" className="size-3.5 lg:size-[0.95vw]" />
          </Link>
        </p>
      </section>

      {/* FAQ */}
      <section className="mt-14 max-w-3xl lg:mt-[4vw] lg:max-w-[62vw]">
        <h2 className="font-sebenta text-2xl font-semibold tracking-tight text-foreground lg:text-[1.944vw]">
          {sub.heading} in {cityRow.name}: common questions
        </h2>
        <dl className="mt-6 space-y-3 lg:mt-[1.667vw] lg:space-y-[0.9vw]">
          {sub.faq.map((f, i) => (
            <div key={i} className="rounded-lg bg-card p-5 ring-1 ring-foreground/10 lg:rounded-[0.556vw] lg:p-[1.389vw]">
              <dt className="font-semibold text-foreground lg:text-[1.111vw]">{f.q}</dt>
              <dd className="mt-1.5 text-muted-foreground lg:mt-[0.4vw] lg:text-[1.02vw]">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

    </div>
    <RoofingPageSections
      ctaTitle={`Get your ${sub.noun} handled in ${cityRow.name}.`}
      ctaBody="Post your job for free and compare quotes from local, vetted roofers."
      ctaHref={quoteHref}
      ctaLabel="Get free quotes"
    />
    </>
  );
}
