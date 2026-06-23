import type { Metadata } from "next";
import Link from "next/link";
import { getStatesWithCounts } from "@/lib/data/locations";
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/seo";
import { ogImageMeta } from "@/lib/og";
import { JsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";

const TITLE = "Roofing contractors near you";
const DESCRIPTION =
  "Find licensed, insured, background-checked roofers in your city. Compare local pros, get free quotes, and only hear from the ones you choose — on Hommy.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: "/roofing" },
    robots: SITE_INDEXABLE ? undefined : { index: false, follow: false },
    ...ogImageMeta({
      title: "Find a roofer you can actually trust",
      kicker: "Roofing",
      stats: [
        { value: "Licensed", label: "& insured pros" },
        { value: "Free", label: "To get quotes" },
        { value: "0", label: "Spam calls" },
      ],
    }),
  };
}

export default async function RoofingHubPage() {
  const states = await getStatesWithCounts();

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-12 lg:pt-16">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: absoluteUrl("/") },
          { name: "Roofing", url: absoluteUrl("/roofing") },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Roofing contractors",
          url: absoluteUrl("/roofing"),
        }}
      />

      <header className="max-w-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Roofing</p>
        <h1 className="font-sebenta text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          Find a roofer you can actually trust, in your city
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {DESCRIPTION} Pick your state to see roofers serving your area.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {states.map((s) => (
          <Link
            key={s.code}
            href={`/roofing/${s.slug}`}
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-5 transition-colors hover:border-primary/40"
          >
            <span className="font-sebenta text-xl font-bold text-foreground">{s.name}</span>
            <span className="text-sm text-muted-foreground">
              {s.indexableCityCount > 0 ? `${s.indexableCityCount} cities` : "Coming soon"}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-center">
        <p className="font-sebenta text-xl font-bold text-foreground">Don&apos;t see your city?</p>
        <p className="mt-2 text-muted-foreground">Post your job and we&apos;ll match you with local roofers as they join.</p>
        <Link
          href="/get-a-quote"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-background"
        >
          Post a job
        </Link>
      </div>
    </div>
  );
}
