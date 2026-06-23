import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { Hero } from "@/components/landing-page/hero";
import { TrustStrip } from "@/components/landing-page/trust-strip";
import { Statement } from "@/components/landing-page/statement";
import { HowItWorks } from "@/components/landing-page/how-it-works";
import { Services } from "@/components/landing-page/services";
import { FeatureSection } from "@/components/landing-page/feature-section";
import { Faq } from "@/components/landing-page/faq";
import { FinalCta } from "@/components/landing-page/final-cta";
import { SiteFooter } from "@/components/landing-page/site-footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const TITLE = "Hommy | Find a roofer you can actually trust";
const DESCRIPTION =
  "Tell us what's going on with your roof and we'll line up a few licensed, insured local roofers near you. Free to post, no spam calls, no pressure.";
const OG_IMAGE = "/bg/landing-page-hero.jpeg";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Hommy",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "A well-kept home with a freshly finished roof",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function HomePage() {
  return (
    <main>
      <Hero />
      <TrustStrip />
      <Statement />
      <HowItWorks />
      <Services />
      {/* <FeatureSection /> */}
      {/* Testimonials go live once we have real reviews to show. */}
      {/* <Testimonials /> */}
      <Faq />
      {/* <ProCta /> */}
      <FinalCta />
    </main>
  );
}
