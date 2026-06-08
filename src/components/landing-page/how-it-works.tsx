"use client";

import { useState } from "react";
import { StepsSection } from "../ui/steps-section";

const HOMEOWNER_STEPS = [
  {
    step: "Step one",
    title: "Tell us about your roof",
    content:
      "Post your job in a couple of minutes — what's going on, where you are, and when you need it done.",
    image: "/bg/worker-1.jpeg",
  },
  {
    step: "Step two",
    title: "We match local pros",
    content:
      "Your job goes to a few licensed, insured roofers near you who actually cover your area.",
    image: "/bg/roof-inspection.jpg",
  },
  {
    step: "Step three",
    title: "Compare & pick",
    content:
      "Get quotes, compare them side by side, and choose the roofer you like. No pressure, no obligation.",
    image: "/bg/roof-replacement.jpg",
  },
];

const ROOFER_STEPS = [
  {
    step: "Step one",
    title: "Get matched leads",
    content:
      "Receive jobs from homeowners near you that fit your services and coverage area — free to view.",
    image: "/bg/worker-1.jpeg",
  },
  {
    step: "Step two",
    title: "Engage the ones you want",
    content:
      "Spend a credit to reach out and quote only the jobs worth your time. No wasted calls, no lead packs.",
    image: "/bg/roof-repair.jpg",
  },
  {
    step: "Step three",
    title: "Win the work",
    content:
      "Get hired, build your reviews, and only pay the full fee when a homeowner accepts your quote.",
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
      "Post your job in minutes and get quotes from verified local roofers. You compare, you choose, no pressure.",
    steps: HOMEOWNER_STEPS,
  },
  roofer: {
    subtitle:
      "Get matched with nearby homeowners, engage the jobs you want, and only pay when you win the work.",
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
