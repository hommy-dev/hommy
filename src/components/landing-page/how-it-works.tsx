"use client";

import { useState } from "react";
import Link from "next/link";
import { StepsSection } from "../ui/steps-section";
import { Icon } from "../ui/icon";
import { MatchProsScene } from "./scenes/match-pros-scene";
import { RoofIntakeScene } from "./scenes/roof-intake-scene";
import { CompareQuotesScene } from "./scenes/compare-quotes-scene";
import { LeadFeedScene } from "./scenes/lead-feed-scene";
import { QuoteChatScene } from "./scenes/quote-chat-scene";
import { WinWorkScene } from "./scenes/win-work-scene";

const HOMEOWNER_STEPS = [
  {
    step: "Step one",
    title: "Tell us about your roof",
    content:
      "Tell us what's going on, where you are, and when you need it done. Takes about two minutes.",
    scene: <RoofIntakeScene />,
  },
  {
    step: "Step two",
    title: "We match local roofers",
    content:
      "Your job goes straight to a handful of licensed, insured roofers who actually work in your neighborhood.",
    scene: <MatchProsScene />,
  },
  {
    step: "Step three",
    title: "Compare & pick",
    content:
      "Compare the quotes side by side and go with the roofer that feels right. No pressure, no obligation.",
    scene: <CompareQuotesScene />,
  },
];

const ROOFER_STEPS = [
  {
    step: "Step one",
    title: "Get matched leads",
    content:
      "See jobs from homeowners near you that fit what you do and where you work. Free to look, every time.",
    scene: <LeadFeedScene />,
  },
  {
    step: "Step two",
    title: "Message the ones you want",
    content:
      "Spend a credit to start a chat and quote the jobs worth your time. No wasted calls, no buying lead packs.",
    scene: <QuoteChatScene />,
  },
  {
    step: "Step three",
    title: "Win the work",
    content:
      "Get hired, earn reviews, and pay the full fee only when a homeowner says yes to your quote.",
    scene: <WinWorkScene />,
  },
];

const TABS = [
  { id: "homeowner", label: "For homeowners" },
  { id: "roofer", label: "For roofers" },
];

const CONTENT = {
  homeowner: {
    subtitle:
      "Post your job in a few minutes and get real quotes from local roofers. You compare, you choose, and there's never any pressure.",
    steps: HOMEOWNER_STEPS,
  },
  roofer: {
    subtitle:
      "Get matched with homeowners nearby, go after the jobs you actually want, and pay only when you win the work.",
    steps: ROOFER_STEPS,
  },
} as const;

type TabId = keyof typeof CONTENT;

export function HowItWorks() {
  const [tab, setTab] = useState<TabId>("homeowner");
  const active = CONTENT[tab];

  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 lg:scroll-mt-[5.556vw] bg-canvas py-16 lg:py-[5vw]"
    >
      <StepsSection
        title="Here's how it works"
        subtitle={active.subtitle}
        features={active.steps}
        tabs={TABS}
        activeTab={tab}
        onTabChange={(id) => setTab(id as TabId)}
        autoPlayInterval={6000}
        className="lg:max-w-[95vw] mx-auto"
      />

      {/* Dual CTA — one for each side of the marketplace. */}
      <div className="mt-10 lg:mt-[2.778vw] flex items-center justify-center gap-3 sm:flex-row lg:gap-[0.833vw]">
        <Link
          href="/get-a-quote"
          className="group inline-flex items-center justify-center gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] border-2 border-transparent bg-primary px-6 lg:px-[1.5vw] py-2 lg:py-[0.556vw] text-[15px] lg:text-[1.042vw] text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Post a job
          <Icon
            name="arrow-right"
            className="size-4 lg:size-[1.25vw] transition-transform group-hover:translate-x-0.5"
          />
        </Link>
        <Link
          href="/contractors"
          className="inline-flex items-center justify-center gap-2 lg:gap-[0.556vw] rounded-md lg:rounded-[0.556vw] border-2 border-foreground/30 px-6 lg:px-[1.5vw] py-2 lg:py-[0.556vw] text-[15px] lg:text-[1.042vw] font-medium text-foreground transition-colors hover:border-foreground/60"
        >
          Join as a roofer
        </Link>
      </div>
    </section>
  );
}
