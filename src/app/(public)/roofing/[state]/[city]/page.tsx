import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCity,
  getCitySupplyForCity,
  getCityDemand,
  getCityStormHistory,
} from "@/lib/data/locations";
import { INDEX_MIN_PROS } from "@/lib/config/seo";
import { ROOFING_SUBTYPE_PAGES } from "@/lib/config/roofing-subtypes";
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/seo";
import { ogImageMeta } from "@/lib/og";
import { getRoofersDirectory } from "@/lib/data/roofers";
import { JsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";
import { Icon } from "@/components/ui/icon";
import { RoofingHero } from "@/components/roofing/roofing-hero";
import { RoofersDirectory } from "@/components/roofing/roofers-directory";
import { RoofingEmpty } from "@/components/roofing/roofing-empty";
import { RoofingPageSections } from "@/components/roofing/roofing-page-sections";

// City pages render on-demand (no generateStaticParams): the indexable set is
// supply-driven and can be empty, which cacheComponents disallows for prerender.
// Indexability is enforced per-request via the noindex gate + sitemap instead.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}): Promise<Metadata> {
  const { state, city } = await params;
  const cityRow = await getCity(state, city);
  if (!cityRow) return {};
  const { proCount } = await getCitySupplyForCity(state, city);
  const indexable = SITE_INDEXABLE && proCount >= INDEX_MIN_PROS;

  const title = `Roofers in ${cityRow.name}, ${cityRow.stateCode}`;
  return {
    title,
    description: `Find licensed, insured roofers serving ${cityRow.name}, ${cityRow.stateName}. Compare local pros, ratings, and get free, no-obligation quotes on Hommy.`,
    alternates: { canonical: `/roofing/${state}/${city}` },
    // The thin-content gate: noindex (but still followable) until supply clears the bar.
    robots: indexable ? undefined : { index: false, follow: true },
    ...ogImageMeta({
      title,
      kicker: `Roofing · ${cityRow.stateName}`,
      stats: [
        ...(proCount > 0
          ? [{ value: String(proCount), label: "Vetted pros" }]
          : []),
        { value: "Free", label: "To get quotes" },
        { value: "0", label: "Spam calls" },
      ],
    }),
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state, city } = await params;
  const cityRow = await getCity(state, city);
  if (!cityRow) notFound();

  const place = `${cityRow.name}, ${cityRow.stateCode}`;
  const quoteHref = `/get-a-quote?where=${encodeURIComponent(place)}`;

  const [dir, demand, storms] = await Promise.all([
    getRoofersDirectory({ near: { lat: cityRow.lat, lng: cityRow.lng }, page: 0, pageSize: 12 }),
    getCityDemand(cityRow.stateCode, cityRow.name),
    getCityStormHistory(cityRow.stateCode, cityRow.name),
  ]);

  return (
    <>
    <div className="mx-auto px-5 pb-10 pt-28 lg:max-w-[95vw] lg:px-[1.389vw] lg:pb-[2vw] lg:pt-[10vw]">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: absoluteUrl("/") },
          { name: "Roofing", url: absoluteUrl("/roofing") },
          { name: cityRow.stateName, url: absoluteUrl(`/roofing/${state}`) },
          { name: cityRow.name, url: absoluteUrl(`/roofing/${state}/${city}`) },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Roofing",
          areaServed: {
            "@type": "City",
            name: cityRow.name,
            containedInPlace: { "@type": "State", name: cityRow.stateName },
          },
          provider: { "@type": "Organization", name: "Hommy", url: absoluteUrl("/") },
        }}
      />

      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground lg:mb-[1.5vw] lg:gap-[0.4vw] lg:text-[0.903vw]" aria-label="Breadcrumb">
        <Link href="/roofing" className="hover:text-foreground">Roofing</Link>
        <span aria-hidden>/</span>
        <Link href={`/roofing/${state}`} className="hover:text-foreground">{cityRow.stateName}</Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{cityRow.name}</span>
      </nav>

      <RoofingHero
        title={`Roofers in ${cityRow.name}, ${cityRow.stateCode}`}
        intro={
          cityRow.intro ??
          `Compare licensed and insured roofers serving ${cityRow.name}. Free to post, no spam calls, and you only hear from the pros you choose.`
        }
        ctaHref={quoteHref}
        demand={
          demand.recentRequests > 0
            ? `${demand.recentRequests} ${demand.recentRequests === 1 ? "homeowner" : "homeowners"} asked for quotes here recently`
            : null
        }
      />

      {/* Companies — the directory scoped to this city */}
      <section className="mt-12 lg:mt-[3.5vw]">
        {dir.total > 0 ? (
          <RoofersDirectory
            initialItems={dir.items}
            initialTotal={dir.total}
            initialHasMore={dir.hasMore}
            scope={{ near: { lat: cityRow.lat, lng: cityRow.lng }, placeLabel: place }}
            quoteHref={quoteHref}
          />
        ) : (
          <RoofingEmpty
            message={`We're adding roofers in ${cityRow.name} now. Post your job for free and we'll match you with local pros as they join.`}
            href={quoteHref}
          />
        )}
      </section>

      {/* Storm context (only when real data exists) */}
      {storms.length > 0 && (
        <section className="mt-14 lg:mt-[4vw]">
          <h2 className="font-sebenta text-2xl font-semibold tracking-tight text-foreground lg:text-[1.944vw]">Recent storm activity near {cityRow.name}</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-[1.667vw] lg:gap-[0.9vw]">
            {storms.map((s, i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 ring-1 ring-foreground/10 lg:gap-[0.8vw] lg:rounded-[0.556vw] lg:px-[1.111vw] lg:py-[0.9vw]">
                <Icon name="storm" className="size-5 shrink-0 text-primary lg:size-[1.4vw]" />
                <span className="text-sm text-muted-foreground lg:text-[0.97vw]">
                  <span className="font-semibold capitalize text-foreground">{s.eventType.replace(/_/g, " ")}</span>
                  {s.severity ? ` · ${s.severity}` : ""} · {new Date(s.detectedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Services → subtype pages */}
      <section className="mt-14 lg:mt-[4vw]">
        <h2 className="font-sebenta text-2xl font-semibold tracking-tight text-foreground lg:text-[1.944vw]">Roofing services in {cityRow.name}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:mt-[1.667vw] lg:grid-cols-4 lg:gap-[1.111vw]">
          {ROOFING_SUBTYPE_PAGES.map((s) => (
            <Link
              key={s.slug}
              href={`/roofing/${state}/${city}/${s.slug}`}
              className="flex flex-col rounded-lg bg-card p-5 ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/25 lg:rounded-[0.556vw] lg:p-[1.389vw]"
            >
              <p className="font-semibold text-foreground lg:text-[1.111vw]">{s.heading}</p>
              <p className="mt-1.5 text-sm text-muted-foreground lg:mt-[0.4vw] lg:text-[0.903vw]">{s.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ (only when curated) */}
      {cityRow.faq && cityRow.faq.length > 0 && (
        <section className="mt-14 max-w-3xl lg:mt-[4vw] lg:max-w-[62vw]">
          <h2 className="font-sebenta text-2xl font-semibold tracking-tight text-foreground lg:text-[1.944vw]">Common questions</h2>
          <dl className="mt-6 space-y-3 lg:mt-[1.667vw] lg:space-y-[0.9vw]">
            {cityRow.faq.map((f, i) => (
              <div key={i} className="rounded-lg bg-card p-5 ring-1 ring-foreground/10 lg:rounded-[0.556vw] lg:p-[1.389vw]">
                <dt className="font-semibold text-foreground lg:text-[1.111vw]">{f.q}</dt>
                <dd className="mt-1.5 text-muted-foreground lg:mt-[0.4vw] lg:text-[1.02vw]">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

    </div>
    <RoofingPageSections
      ctaTitle={`Let's get your ${cityRow.name} roof sorted.`}
      ctaBody="Post your job for free and compare quotes from local, vetted roofers."
      ctaHref={quoteHref}
      ctaLabel="Get free quotes"
    />
    </>
  );
}
