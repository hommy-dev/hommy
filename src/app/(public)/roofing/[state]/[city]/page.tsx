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
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/seo";
import { JsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";

// City pages render on-demand (no generateStaticParams): the indexable set is
// supply-driven and can be empty, which cacheComponents disallows for prerender.
// Indexability is enforced per-request via the noindex gate + sitemap instead.

const ROOFING_SERVICES = [
  { name: "Roof repair", blurb: "Fix leaks, missing shingles, and storm damage before it spreads." },
  { name: "Roof replacement", blurb: "Full tear-off and re-roof when repairs no longer make sense." },
  { name: "Roof inspection", blurb: "Know the real condition of your roof — and what it needs." },
  { name: "Storm damage", blurb: "Hail and wind damage assessments, often tied to an insurance claim." },
];

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

  return {
    title: `Roofers in ${cityRow.name}, ${cityRow.stateCode}`,
    description: `Find licensed, insured roofers serving ${cityRow.name}, ${cityRow.stateName}. Compare local pros, ratings, and get free, no-obligation quotes on Hommy.`,
    alternates: { canonical: `/roofing/${state}/${city}` },
    // The thin-content gate: noindex (but still followable) until supply clears the bar.
    robots: indexable ? undefined : { index: false, follow: true },
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

  const [supply, demand, storms] = await Promise.all([
    getCitySupplyForCity(state, city),
    getCityDemand(cityRow.stateCode, cityRow.name),
    getCityStormHistory(cityRow.stateCode, cityRow.name),
  ]);

  const place = `${cityRow.name}, ${cityRow.stateCode}`;
  const quoteHref = `/get-a-quote?where=${encodeURIComponent(place)}`;

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-12 lg:pt-16">
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

      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/roofing" className="hover:text-foreground">Roofing</Link>
        <span aria-hidden> / </span>
        <Link href={`/roofing/${state}`} className="hover:text-foreground">{cityRow.stateName}</Link>
        <span aria-hidden> / </span>
        <span className="text-foreground">{cityRow.name}</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="font-sebenta text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          Roofers in {cityRow.name}, {cityRow.stateCode}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {cityRow.intro ??
            `Compare licensed, insured, background-checked roofers serving ${cityRow.name}. Post your job free, get quotes, and only hear from the pros you choose.`}
        </p>
        {demand.recentRequests > 0 && (
          <p className="mt-3 text-sm font-medium text-primary">
            {demand.recentRequests} {demand.recentRequests === 1 ? "homeowner" : "homeowners"} requested roofing quotes in {cityRow.name} recently.
          </p>
        )}
        <Link
          href={quoteHref}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-background"
        >
          Get free quotes
        </Link>
      </header>

      {/* Pros */}
      <section className="mt-12">
        <h2 className="font-sebenta text-2xl font-bold text-foreground">
          {supply.proCount > 0
            ? `${supply.proCount} verified ${supply.proCount === 1 ? "roofer" : "roofers"} serving ${cityRow.name}`
            : `Roofers serving ${cityRow.name}`}
        </h2>
        {supply.pros.length > 0 ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {supply.pros.map((p) => (
              <li key={p.id} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
                {p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary contractor logo URL (matches dashboard convention)
                  <img
                    src={p.logoUrl}
                    alt={p.companyName ?? "Roofer"}
                    className="size-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="size-12 shrink-0 rounded-full bg-muted" />
                )}
                <div className="min-w-0">
                  {p.slug ? (
                    <Link
                      href={`/roofers/${p.slug}`}
                      className="block truncate font-semibold text-foreground hover:text-primary"
                    >
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
                  <Link
                    href={p.slug ? `/roofers/${p.slug}` : quoteHref}
                    className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    {p.slug ? "View profile →" : "Get a quote →"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <p className="text-muted-foreground">
              We&apos;re onboarding roofers in {cityRow.name} now. Post your job and we&apos;ll match you with local pros as they join — free, no obligation.
            </p>
            <Link href={quoteHref} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-background">
              Post a job
            </Link>
          </div>
        )}
      </section>

      {/* Storm context (only when real data exists) */}
      {storms.length > 0 && (
        <section className="mt-12">
          <h2 className="font-sebenta text-2xl font-bold text-foreground">Recent storm activity near {cityRow.name}</h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            {storms.map((s, i) => (
              <li key={i} className="rounded-lg border border-border bg-card px-4 py-3">
                <span className="font-medium text-foreground capitalize">{s.eventType.replace(/_/g, " ")}</span>
                {s.severity ? ` · ${s.severity}` : ""} · {new Date(s.detectedAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Services */}
      <section className="mt-12">
        <h2 className="font-sebenta text-2xl font-bold text-foreground">Roofing services in {cityRow.name}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {ROOFING_SERVICES.map((s) => (
            <div key={s.name} className="rounded-2xl border border-border bg-card p-5">
              <p className="font-semibold text-foreground">{s.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ (only when curated) */}
      {cityRow.faq && cityRow.faq.length > 0 && (
        <section className="mt-12">
          <h2 className="font-sebenta text-2xl font-bold text-foreground">Common questions</h2>
          <dl className="mt-4 space-y-4">
            {cityRow.faq.map((f, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5">
                <dt className="font-semibold text-foreground">{f.q}</dt>
                <dd className="mt-1 text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Final CTA */}
      <section className="mt-14 rounded-2xl border border-border bg-card p-8 text-center">
        <p className="font-sebenta text-2xl font-bold text-foreground">Ready for a roof you can trust?</p>
        <p className="mt-2 text-muted-foreground">
          Post your {cityRow.name} roofing job free and compare quotes from local, vetted roofers.
        </p>
        <Link href={quoteHref} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3 font-medium text-background">
          Get free quotes
        </Link>
      </section>
    </div>
  );
}
