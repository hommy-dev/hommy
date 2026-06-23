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
import { JsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";

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

  return {
    title: `${sub.heading} in ${cityRow.name}, ${cityRow.stateCode}`,
    description: `Compare local, vetted roofers for ${sub.noun} in ${cityRow.name}, ${cityRow.stateName}. Free quotes, no spam calls — only the pros you choose, on Hommy.`,
    alternates: { canonical: `/roofing/${state}/${city}/${subtype}` },
    robots: indexable ? undefined : { index: false, follow: true },
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

  const [supply, demand] = await Promise.all([
    getCitySubtypeSupply(state, city, sub.label),
    getCityDemand(cityRow.stateCode, cityRow.name),
  ]);

  const place = `${cityRow.name}, ${cityRow.stateCode}`;
  const quoteHref = `/get-a-quote?where=${encodeURIComponent(place)}`;
  const cityHref = `/roofing/${state}/${city}`;

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-12 lg:pt-16">
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

      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/roofing" className="hover:text-foreground">Roofing</Link>
        <span aria-hidden> / </span>
        <Link href={`/roofing/${state}`} className="hover:text-foreground">{cityRow.stateName}</Link>
        <span aria-hidden> / </span>
        <Link href={cityHref} className="hover:text-foreground">{cityRow.name}</Link>
        <span aria-hidden> / </span>
        <span className="text-foreground">{sub.heading}</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="font-sebenta text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          {sub.heading} in {cityRow.name}, {cityRow.stateCode}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{sub.intro(cityRow.name)}</p>
        {demand.recentRequests > 0 && (
          <p className="mt-3 text-sm font-medium text-primary">
            {demand.recentRequests} {demand.recentRequests === 1 ? "homeowner" : "homeowners"} requested roofing quotes in {cityRow.name} recently.
          </p>
        )}
        <Link
          href={quoteHref}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-background"
        >
          Get free {sub.noun} quotes
        </Link>
      </header>

      {/* Pros offering this subtype */}
      <section className="mt-12">
        <h2 className="font-sebenta text-2xl font-bold text-foreground">
          {supply.proCount > 0
            ? `${supply.proCount} ${supply.proCount === 1 ? "roofer" : "roofers"} offering ${sub.noun} in ${cityRow.name}`
            : `Roofers for ${sub.noun} in ${cityRow.name}`}
        </h2>
        {supply.pros.length > 0 ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {supply.pros.map((p) => (
              <li key={p.id} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
                {p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary contractor logo URL
                  <img src={p.logoUrl} alt={p.companyName ?? "Roofer"} className="size-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="size-12 shrink-0 rounded-full bg-muted" />
                )}
                <div className="min-w-0">
                  {p.slug ? (
                    <Link href={`/roofers/${p.slug}`} className="block truncate font-semibold text-foreground hover:text-primary">
                      {p.companyName ?? "Verified roofer"}
                    </Link>
                  ) : (
                    <p className="truncate font-semibold text-foreground">{p.companyName ?? "Verified roofer"}</p>
                  )}
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {p.avgRating != null && p.totalReviews > 0
                      ? `★ ${p.avgRating.toFixed(1)} (${p.totalReviews})`
                      : "Newly verified"}
                    {p.yearsInBusiness ? ` · ${p.yearsInBusiness} yrs` : ""}
                  </p>
                  <Link href={p.slug ? `/roofers/${p.slug}` : quoteHref} className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                    {p.slug ? "View profile →" : "Get a quote →"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <p className="text-muted-foreground">
              We&apos;re onboarding roofers for {sub.noun} in {cityRow.name}. Post your job and we&apos;ll match you with local pros — free, no obligation.
            </p>
            <Link href={quoteHref} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-background">
              Post a job
            </Link>
          </div>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href={cityHref} className="text-primary hover:underline">See all roofers in {cityRow.name} →</Link>
        </p>
      </section>

      {/* FAQ */}
      <section className="mt-12">
        <h2 className="font-sebenta text-2xl font-bold text-foreground">
          {sub.heading} in {cityRow.name} — common questions
        </h2>
        <dl className="mt-4 space-y-4">
          {sub.faq.map((f, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <dt className="font-semibold text-foreground">{f.q}</dt>
              <dd className="mt-1 text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* CTA */}
      <section className="mt-14 rounded-2xl border border-border bg-card p-8 text-center">
        <p className="font-sebenta text-2xl font-bold text-foreground">Need {sub.noun} in {cityRow.name}?</p>
        <p className="mt-2 text-muted-foreground">Post your job free and compare quotes from local, vetted roofers.</p>
        <Link href={quoteHref} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3 font-medium text-background">
          Get free quotes
        </Link>
      </section>
    </div>
  );
}
