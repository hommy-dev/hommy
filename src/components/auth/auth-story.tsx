"use client";

// A minimal, dark-native "how it works" animation for the auth showcase panel.
// Three steps light up in sequence with a filling connector, so the process
// reads clearly just by watching — no white cards clashing with the dark panel.
// Decorative: the parent panel is aria-hidden.

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icon";
import type { Audience } from "./auth-experience";

type Step = { icon: IconName; title: string; detail: string };

const STORIES: Record<Audience, Step[]> = {
  homeowner: [
    {
      icon: "edit",
      title: "Tell us about your project",
      detail: "A few quick details, about two minutes.",
    },
    {
      icon: "search",
      title: "Get matched with vetted roofers",
      detail: "Licensed, insured, and local to you.",
    },
    {
      icon: "badge-check",
      title: "Compare quotes and choose",
      detail: "Side by side. No pressure, no obligation.",
    },
  ],
  contractor: [
    {
      icon: "discovery",
      title: "See nearby jobs",
      detail: "Real homeowner requests. Free to look.",
    },
    {
      icon: "chat",
      title: "Quote the ones you want",
      detail: "Start a chat and send your price.",
    },
    {
      icon: "wallet",
      title: "Win the work",
      detail: "Pay the full fee only when you win.",
    },
  ],
};

export function AuthStory({ audience }: { audience: Audience }) {
  const reduce = useReducedMotion();
  const steps = STORIES[audience];

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setTick((t) => t + 1), 2400);
    return () => clearInterval(id);
  }, [reduce]);

  // Under reduced motion, show every step as completed (no movement).
  const active = reduce ? steps.length - 1 : tick % steps.length;

  return (
    <ol className="w-full max-w-[28vw]">
      {steps.map((s, i) => {
        const done = i < active;
        const current = i === active;
        const lit = done || current;
        const isLast = i === steps.length - 1;
        return (
          <li
            key={s.title}
            className={cn("relative flex gap-[1.111vw]", !isLast && "pb-[1.667vw]")}
          >
            {/* Connector that fills as the step completes */}
            {!isLast ? (
              <span className="absolute left-[1.25vw] top-[2.5vw] bottom-0 w-px -translate-x-1/2 overflow-hidden bg-white/12">
                <span
                  className={cn(
                    "block w-full bg-primary transition-[height] duration-500 ease-out",
                    done ? "h-full" : "h-0",
                  )}
                />
              </span>
            ) : null}

            {/* Step marker */}
            <span
              className={cn(
                "relative z-10 flex size-[2.5vw] shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                lit
                  ? "border-primary bg-primary text-white"
                  : "border-white/20 bg-white/5 text-white/40",
                current && "shadow-[0_0_0_0.35vw_color-mix(in_oklab,var(--primary)_30%,transparent)]",
              )}
            >
              <Icon
                name={done ? "tick" : s.icon}
                className="size-[1.25vw]"
              />
            </span>

            {/* Step copy */}
            <div className="pt-[0.35vw]">
              <p
                className={cn(
                  "text-[1.111vw] font-semibold leading-tight transition-colors duration-300",
                  current
                    ? "text-background"
                    : done
                      ? "text-background/75"
                      : "text-background/45",
                )}
              >
                {s.title}
              </p>
              <p
                className={cn(
                  "mt-[0.139vw] text-[0.903vw] leading-snug transition-colors duration-300",
                  lit ? "text-background/55" : "text-background/30",
                )}
              >
                {s.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
