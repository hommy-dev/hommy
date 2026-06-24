import type { Metadata } from "next";

import { getRoofersDirectory } from "@/lib/data/roofers";
import { absoluteUrl, SITE_INDEXABLE } from "@/lib/seo";
import { ogImageMeta } from "@/lib/og";
import { JsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";
import { RoofingHero } from "@/components/roofing/roofing-hero";
import { RoofersDirectory } from "@/components/roofing/roofers-directory";
import { RoofingPageSections } from "@/components/roofing/roofing-page-sections";

const TITLE = "Roofing companies near you";
const DESCRIPTION =
  "Browse verified, licensed and insured roofing companies. Search by name or area, filter by the work you need, and get free quotes from the pros you choose.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/roofers" },
  robots: SITE_INDEXABLE ? undefined : { index: false, follow: false },
  ...ogImageMeta({
    title: "Find a roofing company you can trust",
    kicker: "Roofing companies",
    stats: [
      { value: "Verified", label: "Licensed & insured" },
      { value: "Free", label: "To get quotes" },
      { value: "0", label: "Spam calls" },
    ],
  }),
};

export default async function RoofersDirectoryPage() {
  const initial = await getRoofersDirectory({ page: 0, pageSize: 12 });

  return (
    <>
      <div className="mx-auto px-5 pb-10 pt-28 lg:max-w-[95vw] lg:px-[1.389vw] lg:pb-[2vw] lg:pt-[10vw]">
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: absoluteUrl("/") },
            { name: "Roofing companies", url: absoluteUrl("/roofers") },
          ]}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Roofing companies",
            url: absoluteUrl("/roofers"),
          }}
        />

        <RoofingHero
          title="Find a roofing company you can trust"
          intro="Every company here is verified, licensed, and insured. Search by area, filter by the work you need, and reach out to the ones you like."
          ctaHref="/get-a-quote"
        />

        <div className="mt-12 lg:mt-[3.5vw]">
          <RoofersDirectory
            initialItems={initial.items}
            initialTotal={initial.total}
            initialHasMore={initial.hasMore}
          />
        </div>
      </div>

      <RoofingPageSections
        ctaTitle="Rather have roofers come to you?"
        ctaBody="Post your job for free and we'll match you with local, vetted roofers."
        ctaHref="/get-a-quote"
        ctaLabel="Post a job"
      />
    </>
  );
}
