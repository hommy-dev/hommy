"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";
import { SVGIcon } from "../ui/svg-icon";
import { Icon } from "../ui/icon";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Feature = {
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  background: string; // optional image or pattern for the card background
};

const FEATURES: Feature[] = [
  {
    icon: "/icons/category.svg",
    eyebrow: "Lead CRM",
    title: "Every lead in one inbox",
    body: "New requests, the jobs you're chasing, and the ones you've won, all in one place instead of scattered across calls, texts, and sticky notes.",
    points: ["Filter by service & area", "See status at a glance"],
    background: "/bg/gradient-0.jpg",
  },
  {
    icon: "/icons/activity.svg",
    eyebrow: "Project management",
    title: "Track every job in real time",
    body: "Stages, schedules, and updates that move as the work does, and keep the homeowner in the loop without you lifting a finger.",
    points: ["Live job stages", "Automatic homeowner updates"],
    background: "/bg/gradient-0.jpg",
  },
  {
    icon: "/icons/chat.svg",
    eyebrow: "Messaging",
    title: "One thread per job",
    body: "Chat, share photos, and send quotes without losing the conversation in a pile of texts and emails.",
    points: ["Photos & files inline", "Quotes in the same thread"],
    background: "/bg/gradient-0.jpg",
  },
  {
    icon: "/icons/danger-triangle.svg",
    eyebrow: "Storm alerts",
    title: "Be first after the storm",
    body: "Get notified the moment severe weather rolls through your area, and reach the homeowners who need a roofer most.",
    points: ["Severe-weather watch", "Instant local alerts"],
    background: "/bg/gradient-0.jpg",
  },
  {
    icon: "/icons/wallet.svg",
    eyebrow: "Credits & billing",
    title: "Pay only for what you win",
    body: "No lead packs, no monthly waste. Just a simple credit balance you top up and control, charged only when a quote gets accepted.",
    points: ["Transparent per-lead cost", "Top up, never locked in"],
    background: "/bg/gradient-0.jpg",
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col justify-between gap-8 lg:gap-[2.222vw] overflow-hidden rounded-2xl lg:rounded-[1.111vw] bg-cover bg-center p-8 sm:p-10 lg:flex-row lg:items-center lg:p-[3vw] bg-[#ccc3ff]",
      )}
      // style={{ backgroundImage: `url(${feature.background})` }}
    >
     

      {/* copy */}
      <div className="relative lg:max-w-[33vw]">
        <div className="flex items-center gap-3 lg:gap-[0.833vw]">
          <span className="flex size-11 lg:size-[3vw] items-center justify-center rounded-xl lg:rounded-[0.833vw] bg-current/15">
            <SVGIcon src={feature.icon} className="size-6 lg:size-[1.667vw]" />
          </span>
          <span className="text-xs lg:text-[0.833vw] font-semibold uppercase tracking-[0.18em] opacity-70">
            {feature.eyebrow}
          </span>
        </div>

        <h3 className="mt-6 lg:mt-[1.667vw] font-sebenta text-3xl lg:text-[2.4vw] font-semibold leading-[1.1] tracking-tight sm:text-4xl">
          {feature.title}
        </h3>
        <p className="mt-4 lg:mt-[1.111vw] text-base lg:text-[1.2vw] font-medium leading-relaxed opacity-80">
          {feature.body}
        </p>

        <ul className="mt-6 lg:mt-[1.667vw] flex flex-col gap-3 lg:gap-[0.833vw]">
          {feature.points.map((p) => (
            <li
              key={p}
              className="flex items-center gap-2.5 lg:gap-[0.694vw] text-sm lg:text-[1.042vw] font-semibold"
            >
              <Icon
                name="tick-square"
                className="size-5 lg:size-[1.389vw] opacity-80"
              />
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* visual mock — adapts to the card colour via currentColor */}
      <div className="relative hidden aspect-[16/10] w-full overflow-hidden rounded-xl lg:rounded-[0.833vw] bg-current/[0.06] lg:block lg:w-[33vw]">
        <div className="absolute inset-0 flex flex-col gap-4 lg:gap-[1.111vw] p-6 lg:p-[2vw]">
          <div className="flex items-center gap-3 lg:gap-[0.833vw]">
            <span className="flex size-12 lg:size-[3.5vw] items-center justify-center rounded-lg lg:rounded-[0.694vw] bg-current/15">
              <SVGIcon
                src={feature.icon}
                className="size-7 lg:size-[1.944vw]"
              />
            </span>
            <div className="flex flex-col gap-2 lg:gap-[0.556vw]">
              <div className="h-2.5 lg:h-[0.694vw] w-28 lg:w-[10vw] rounded-full bg-current/25" />
              <div className="h-2 lg:h-[0.556vw] w-20 lg:w-[7vw] rounded-full bg-current/15" />
            </div>
            <span className="ml-auto text-xl lg:text-[1.667vw] font-bold opacity-30">
              0{index + 1}
            </span>
          </div>
          <div className="mt-auto flex flex-col gap-3 lg:gap-[0.833vw]">
            {[0.92, 0.78, 0.64].map((w, i) => (
              <div
                key={i}
                className="h-3 lg:h-[0.833vw] rounded-full bg-current/12"
                style={{ width: `${w * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureSection() {
  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Sticky stacking only on desktop — on mobile the cards just flow vertically.
      mm.add("(min-width: 1024px)", () => {
        const cards = cardsRef.current.filter(Boolean);
        if (cards.length < 2) return;

        const last = cards.length - 1;

        // Every card after the first starts just below the stage, ready to rise.
        gsap.set(cards.slice(1), { yPercent: 100 });

        // `current` = how many cards are stacked up. The scroll position only
        // decides this target index (in whole steps); the cards themselves play
        // their own smooth slide to fully cover — never glued to scroll velocity,
        // so there's no track-slow-then-jump, just one clean motion per step.
        let current = 0;

        const settle = (target: number) => {
          if (target === current) return;
          current = target;
          cards.forEach((card, i) => {
            if (i === 0) return;
            gsap.to(card, {
              yPercent: i <= target ? 0 : 100,
              duration: 0.9,
              ease: "power3.inOut",
              overwrite: "auto",
            });
          });
        };

        ScrollTrigger.create({
          trigger: pinRef.current,
          start: "top top",
          end: () => "+=" + window.innerHeight * last,
          pin: true,
          invalidateOnRefresh: true,
          // Rest the scroll on whole-card stops so it never sits mid-step.
          snap: {
            snapTo: 1 / last,
            duration: { min: 0.2, max: 0.5 },
            ease: "power2.inOut",
            directional: true,
          },
          onUpdate: (self) => {
            // A little past a card's halfway point flips the target, and that
            // card smoothly rises all the way up on its own.
            settle(Math.round(self.progress * last));
          },
          onRefresh: () => {
            current = 0;
            gsap.set(cards, { yPercent: (i) => (i === 0 ? 0 : 100) });
          },
        });
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      className="scroll-mt-20 lg:scroll-mt-[5.556vw] bg-canvas"
    >
      <div className="max-w-[90vw] mx-auto px-5 lg:px-[1.389vw] pt-24 lg:pt-[6.667vw] text-center">
        <h2 className="font-sebenta text-3xl md:text-4xl lg:text-[3.333vw] font-semibold tracking-tight">
          One platform to run the work
        </h2>
        <p className="mx-auto mt-4 lg:mt-[1.111vw] max-w-xl lg:max-w-[41.66vw] text-base lg:text-[1.2vw] font-medium leading-relaxed text-muted-foreground">
          From the first lead to the final invoice, everything a roofer needs to
          win jobs and keep them on track, all in one place.
        </p>
      </div>

      <div ref={pinRef} className="relative">
        <div className="max-w-[90vw] mx-auto px-5 lg:px-[1.389vw] py-16 lg:py-0 lg:flex lg:min-h-screen lg:items-center">
          <div className="relative flex flex-col gap-6 lg:block lg:h-[34vw] lg:w-full lg:gap-0 lg:overflow-hidden">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.eyebrow}
                ref={(el) => {
                  if (el) cardsRef.current[i] = el;
                }}
                style={{ zIndex: i }}
                className="relative lg:absolute lg:inset-0"
              >
                <FeatureCard feature={feature} index={i} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
