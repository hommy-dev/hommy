import { StepsSection } from "@/components/ui/steps-section";
import { LeadFeedScene } from "../scenes/lead-feed-scene";
import { QuoteChatScene } from "../scenes/quote-chat-scene";
import { WinWorkScene } from "../scenes/win-work-scene";

// The roofer side of the homepage "How it works" — same scenes, but standalone
// (no homeowner/roofer tabs) since this whole page is for roofers.
const STEPS = [
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

export function ContractorHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 lg:scroll-mt-[5.556vw] bg-canvas py-16 lg:py-[5vw]"
    >
      <StepsSection
        title="How Hommy works for roofers"
        subtitle="Get matched with homeowners nearby, go after the jobs you actually want, and pay only when you win the work."
        features={STEPS}
        autoPlayInterval={6000}
        className="lg:max-w-[95vw] mx-auto"
      />
    </section>
  );
}
