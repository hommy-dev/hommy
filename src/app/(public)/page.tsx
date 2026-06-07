import type { Metadata } from "next";
import { SiteHeader } from "@/components/public/site-header";
import { Hero } from "@/components/landing-page/hero";
import { TrustStrip } from "@/components/landing-page/trust-strip";
import { HowItWorks } from "@/components/landing-page/how-it-works";
import { Services } from "@/components/landing-page/services";
import { Storm } from "@/components/landing-page/storm";
import { Testimonials } from "@/components/landing-page/testimonials";
import { ProCta } from "@/components/landing-page/pro-cta";
import { SiteFooter } from "@/components/landing-page/site-footer";

export const metadata: Metadata = {
  title: "Homei | Find a roofer you can actually trust",
  description:
    "Tell us what is going on with your roof and we will match you with a few licensed, insured local roofers. Free, no spam calls, no pressure.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <Services />
        <Storm />
        <Testimonials />
        <ProCta />
      </main>
      <SiteFooter />
    </div>
  );
}
