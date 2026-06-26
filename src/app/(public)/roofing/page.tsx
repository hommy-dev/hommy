import type { Metadata } from "next";
import { getStatesWithCounts } from "@/lib/data/locations";
import { getRoofersDirectory } from "@/lib/data/roofers";
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/seo";
import { ogImageMeta } from "@/lib/og";
import { JsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";
import { RoofingHero } from "@/components/roofing/roofing-hero";
import { RoofersDirectory } from "@/components/roofing/roofers-directory";
import { RoofingLocationCard } from "@/components/roofing/roofing-location-card";
import { RoofingPageSections } from "@/components/roofing/roofing-page-sections";

const TITLE = "Roofing contractors near you";
const DESCRIPTION =
  "Find licensed and insured roofers in your city. Compare local pros, get free quotes, and only hear from the ones you choose.";

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
  const [states, dir] = await Promise.all([
    getStatesWithCounts(),
    getRoofersDirectory({ page: 0, pageSize: 12 }),
  ]);
  // Only surface states that actually have inventory — no "coming soon" shells.
  const liveStates = states.filter((s) => s.indexableCityCount > 0);

  return (
    <>
    <div className="mx-auto px-5 pb-10 pt-28 lg:max-w-[95vw] lg:px-[1.389vw] lg:pb-[2vw] lg:pt-[10vw]">
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

      <RoofingHero
        title="Find a roofer you can actually trust"
        intro={DESCRIPTION}
        ctaHref="/get-a-quote"
      />

      {/* Companies first — the full directory */}
      <section className="mt-12 lg:mt-[3.5vw]">
        <RoofersDirectory
          initialItems={dir.items}
          initialTotal={dir.total}
          initialHasMore={dir.hasMore}
        />
      </section>

      {/* Browse by area (only states with real inventory) */}
      {liveStates.length > 0 && (
        <section className="mt-14 lg:mt-[4vw]">
          <h2 className="font-sebenta text-2xl font-semibold tracking-tight text-foreground lg:text-[1.944vw]">
            Browse roofers by area
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-[1.667vw] lg:grid-cols-3 lg:gap-[1.111vw]">
            {liveStates.map((s) => (
              <RoofingLocationCard
                key={s.code}
                href={`/roofing/${s.slug}`}
                name={s.name}
                count={`${s.indexableCityCount} ${s.indexableCityCount === 1 ? "city" : "cities"}`}
              />
            ))}
          </div>
        </section>
      )}

    </div>
    <RoofingPageSections
      ctaTitle="Don't see your city?"
      ctaBody="Post your job for free and we'll match you with local roofers as they join."
      ctaHref="/get-a-quote"
      ctaLabel="Post a job"
    />
    </>
  );
}
