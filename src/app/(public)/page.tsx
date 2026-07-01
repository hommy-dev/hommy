import type { Metadata } from "next";
import { Hero } from "@/components/landing-page/hero";
import { TrustStrip } from "@/components/landing-page/trust-strip";
import { Statement } from "@/components/landing-page/statement";
import { HowItWorksLazy } from "@/components/landing-page/how-it-works-lazy";
import { Services } from "@/components/landing-page/services";
import { Faq } from "@/components/landing-page/faq";
import { FinalCta } from "@/components/landing-page/final-cta";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/structured-data";
import { ogImageUrl } from "@/lib/og";
import { Testimonials } from "@/components/landing-page/testimonials";

const TITLE = "Hommy | Find a roofer you can actually trust";
const DESCRIPTION =
  "Tell us what's going on with your roof and we'll line up a few licensed, insured local roofers near you. Free to post, no spam calls, no pressure.";

// Dynamic branded share card (the /og route) — matches the landing hero.
const OG_CARD = ogImageUrl({ title: "Find a roofer you can actually trust" });

export const metadata: Metadata = {
  // `absolute` opts out of the "%s | Hommy" template — the brand is already in TITLE.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Hommy",
    images: [
      {
        url: OG_CARD,
        width: 1200,
        height: 630,
        alt: TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_CARD],
  },
};

export default function HomePage() {
  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <Hero />
      <TrustStrip />
      <Statement />
      <HowItWorksLazy />
      <Services />
      {/* <Testimonials /> */}
      <Faq />
      <FinalCta />
    </>
  );
}
