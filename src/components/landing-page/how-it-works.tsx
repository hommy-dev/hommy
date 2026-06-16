"use client";

import { useState } from "react";
import { StepsSection } from "../ui/steps-section";

const HOMEOWNER_STEPS = [
  {
    step: "Step one",
    title: "Tell us about your roof",
    content:
      "Tell us what's going on, where you are, and when you need it done. Takes about two minutes.",
    image: "/bg/worker-1.jpeg",
  },
  {
    step: "Step two",
    title: "We match local pros",
    content:
      "Your job goes straight to a handful of licensed, insured roofers who actually work in your neighborhood.",
    image: "/bg/roof-inspection.jpg",
  },
  {
    step: "Step three",
    title: "Compare & pick",
    content:
      "Compare the quotes side by side and go with the roofer that feels right. No pressure, no obligation.",
    image: "/bg/roof-replacement.jpg",
  },
];

const ROOFER_STEPS = [
  {
    step: "Step one",
    title: "Get matched leads",
    content:
      "See jobs from homeowners near you that fit what you do and where you work. Free to look, every time.",
    image: "/bg/worker-1.jpeg",
  },
  {
    step: "Step two",
    title: "Message the ones you want",
    content:
      "Spend a credit to start a chat and quote the jobs worth your time. No wasted calls, no buying lead packs.",
    image: "/bg/roof-repair.jpg",
  },
  {
    step: "Step three",
    title: "Win the work",
    content:
      "Get hired, earn reviews, and pay the full fee only when a homeowner says yes to your quote.",
    image: "/bg/roof-replacement.jpg",
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
        className="max-w-[90vw] mx-auto"
      />
    </section>
  );
}
