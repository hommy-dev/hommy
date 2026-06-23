import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStateWithCities } from "@/lib/data/locations";
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/seo/structured-data";

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

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-12 lg:pt-16">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: absoluteUrl("/") },
          { name: "Roofing", url: absoluteUrl("/roofing") },
          { name: data.state.name, url: absoluteUrl(`/roofing/${state}`) },
        ]}
      />

      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/roofing" className="hover:text-foreground">
          Roofing
        </Link>
        <span aria-hidden> / </span>
        <span className="text-foreground">{data.state.name}</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="font-sebenta text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          Roofing contractors in {data.state.name}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Licensed, insured, background-checked roofers serving {data.state.name}. Choose your city to compare local pros.
        </p>
      </header>

      {data.cities.length > 0 ? (
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.cities.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/roofing/${state}/${c.slug}`}
                className="block rounded-xl border border-border bg-card px-4 py-3 font-medium text-foreground transition-colors hover:border-primary/40"
              >
                Roofers in {c.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-muted-foreground">
            We&apos;re onboarding roofers across {data.state.name} now. Post your job and we&apos;ll match you as pros join.
          </p>
        </div>
      )}

      <div className="mt-12 text-center">
        <Link
          href="/get-a-quote"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-background"
        >
          Post a job
        </Link>
      </div>
    </div>
  );
}
