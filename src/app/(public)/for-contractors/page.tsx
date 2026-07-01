import type { Metadata } from "next";
import { ContractorHero } from "@/components/landing-page/contractors/hero";
import { ContractorValueStrip } from "@/components/landing-page/contractors/value-strip";
import { ContractorStatement } from "@/components/landing-page/contractors/statement";
import { ContractorHowItWorks } from "@/components/landing-page/contractors/how-it-works";
import { ContractorDifference } from "@/components/landing-page/contractors/the-difference";
import { Faq, type FaqItem } from "@/components/landing-page/faq";
import { FinalCta } from "@/components/landing-page/final-cta";
import { ogImageUrl } from "@/lib/og";

const TITLE = "For Roofers | Win more jobs with Hommy";
const DESCRIPTION =
  "Get matched with homeowners near you, see every job for free, and pay a real fee only when you win the work. No lead packs, no monthly fees. Join with $300 in free credits.";

const OG_CARD = ogImageUrl({ title: "Win more roofing jobs. Only pay when you do." });

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/for-contractors" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Hommy",
    images: [{ url: OG_CARD, width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_CARD],
  },
};

const ROOFER_FAQS: FaqItem[] = [
  {
    q: "What does it cost to get leads?",
    a: "Receiving leads is free. You spend 1 credit (about $1) only when you start a conversation, and a small win fee only when a homeowner accepts your quote. No win, no fee.",
  },
  {
    q: "Is there a monthly fee or contract?",
    a: "No. There's no subscription and no lead packs. You top up a credit balance you control, and you can stop anytime. Unused credits stay in your wallet.",
  },
  {
    q: "What are the $300 in free credits?",
    a: "Every new company starts with $300 in credits, enough to start hundreds of conversations and win several jobs before you spend a dollar of your own.",
  },
  {
    q: "How do leads get shared?",
    a: "Every roofer who covers the area sees the job. The homeowner sees who's interested, with your rating and profile, and picks. There's no racing to call first.",
  },
  {
    q: "How do I get verified?",
    a: "Upload your license and proof of insurance. We check them before you can quote, which also earns you a verified badge that homeowners trust.",
  },
  {
    q: "Which areas can I serve?",
    a: "You set your own coverage area, and jobs are matched to where you actually work. Hommy is geo-based, so you're matched by real location, not a fixed city list.",
  },
  {
    q: "Do I keep my reviews?",
    a: "Yes. Your Hommy profile, reviews, and job history are yours, and you can import your existing Google reviews so your reputation follows you.",
  },
  {
    q: "What else do I get besides leads?",
    a: "A full workspace to run the work: a lead inbox, per-job messaging, quotes, project tracking, storm alerts, and simple credit billing, all in one place.",
  },
];

export default function ContractorsLandingPage() {
  return (
    <>
      <ContractorHero />
      <ContractorValueStrip />
      <ContractorStatement />
      <ContractorHowItWorks />
      <ContractorDifference />
      <Faq faqs={ROOFER_FAQS} title="Roofer questions, answered" />
      <FinalCta
        title="Ready to win more roofing jobs?"
        body="Join free, get $300 in credits, and only pay when you win the work."
        label="Register your company"
        href="/auth/signup/contractor"
      />
    </>
  );
}
