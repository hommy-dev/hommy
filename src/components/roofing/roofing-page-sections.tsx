import { TrustStrip } from "@/components/landing-page/trust-strip";
import { HowItWorks } from "@/components/landing-page/how-it-works";
import { FinalCta } from "@/components/landing-page/final-cta";

/**
 * Shared full-bleed footer sequence for the roofing / roofer pages: the same
 * trust strip, "how it works", and closing CTA the homepage uses, so every page
 * ends with consistent, on-brand context. Render as a sibling of the page's
 * constrained content container (not inside it) so the sections stay full width.
 */
export function RoofingPageSections({
  ctaTitle,
  ctaBody,
  ctaLabel,
  ctaHref,
}: {
  ctaTitle: string;
  ctaBody: string;
  ctaLabel?: string;
  ctaHref: string;
}) {
  return (
    <>
      <TrustStrip />
      <HowItWorks />
      <FinalCta title={ctaTitle} body={ctaBody} label={ctaLabel} href={ctaHref} />
    </>
  );
}
