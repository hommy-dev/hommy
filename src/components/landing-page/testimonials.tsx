"use client";

import { useState } from "react";
import { LandingImage } from "./shared";
import { Icon } from "../ui/icon";
import { Button } from "../ui/button";

const REVIEWS = [
  {
    quote:
      "I had three roofers out by the next afternoon. I went with the one who actually explained things instead of talking over my head — new roof in a week.",
    name: "Maria A.",
    image: "/bg/roof-replacement.jpg",
  },
  {
    quote:
      "We had a leak in the middle of a storm and no clue who to call. Homei had someone at the house the next morning. No drama.",
    name: "James C.",
    image: "/bg/storm-damage.jpg",
  },
  {
    quote:
      "I dreaded the spam, so I kept putting off quotes. This was just two local roofers, both solid, both upfront.",
    name: "Priya N.",
    image: "/bg/roof-repair.jpg",
  },
];

export function Testimonials() {
  const [i, setI] = useState(0);
  const r = REVIEWS[i];
  const go = (d: number) =>
    setI((x) => (x + d + REVIEWS.length) % REVIEWS.length);

  return (
    <section
      id="reviews"
      className="scroll-mt-20 lg:scroll-mt-[5.556vw] py-24 lg:py-[6.667vw]"
    >
      <div className="lg:max-w-[90vw] mx-auto px-5 lg:px-[1.389vw]">
        {/* bottom row — testimonial left, image right */}
        <div className="mt-16 lg:mt-[4.444vw] grid gap-10 lg:gap-[2.778vw] lg:grid-cols-2">
          <div className="h-full flex flex-col justify-between gap-4 lg:gap-[2vw]">
            <h2 className="font-sebenta text-[2.3rem] lg:text-[2.555vw] font-bold leading-[1.05] tracking-tight sm:text-5xl">
              Hear from our
              <br className="hidden sm:block" /> happy homeowners.
            </h2>
            <div>
              <div className="flex items-center gap-3 lg:gap-[0.833vw]">
                <span className="flex size-11 lg:size-[3.056vw] items-center justify-center rounded-full border bg-background font-sebenta text-base lg:text-[1.111vw] font-bold text-foreground/70">
                  {r.name.charAt(0)}
                </span>
                <span className="text-[15px] lg:text-[1.042vw] font-semibold">
                  {r.name}
                </span>
              </div>

              <blockquote className="mt-5 lg:mt-[1.389vw] max-w-md lg:max-w-[31.108vw] font-medium text-[16px] lg:text-[1.3vw] leading-relaxed text-foreground/80">
                &ldquo;{r.quote}&rdquo;
              </blockquote>

              <div className="mt-8 lg:mt-[2.222vw] flex items-center gap-3 lg:gap-[0.833vw]">
                <Button
                  onClick={() => go(-1)}
                  aria-label="Previous review"
                  variant="ghost"
                  className="border border-foreground/30 rounded-full size-6 lg:size-[2.5vw] "
                >
                  <Icon
                    name="arrow-left"
                    className="size-4 lg:size-[1.5vw] text-muted-foreground"
                  />
                </Button>
                <Button
                  onClick={() => go(1)}
                  aria-label="Next review"
                  variant="ghost"
                  className="border border-foreground/30 rounded-full size-6 lg:size-[2.5vw] "
                >
                  <Icon
                    name="arrow-right"
                    className="size-4 lg:size-[1.5vw] text-muted-foreground"
                  />
                </Button>
              </div>
            </div>
          </div>

          <LandingImage
            src={r.image}
            alt={`${r.name}'s roofing project`}
            className="aspect-[4/3] w-full rounded-lg lg:rounded-[0.694vw]"
          />
        </div>
      </div>
    </section>
  );
}

