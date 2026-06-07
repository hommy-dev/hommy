import Link from "next/link";
import { cn } from "@/lib/utils";
import { SectionHead, LandingImage, Arrow } from "./shared";
import { SVGIcon } from "../ui/svg-icon";

const SERVICES = [
  {
    title: "Roof repair",
    body: "Leaks, missing shingles, that nagging spot you keep eyeing. Get it looked at and sorted before it turns into a bigger bill.",
    src: "/bg/roof-repair.jpg",
  },
  {
    title: "Full replacement",
    body: "When the old roof is past saving, get straight numbers from roofers who'll stand behind the work — and the warranty.",
    src: "/bg/roof-replacement.jpg",
  },
  {
    title: "Storm damage",
    body: "Hit by hail or high wind? Get inspected fast by a roofer who knows the damage and how to handle the insurance side.",
    src: "/bg/storm-damage.jpg",
  },
  {
    title: "Roof inspection",
    body: "Buying, selling, or just want peace of mind. Find out exactly what shape your roof is in, no guesswork.",
    src: "/bg/roof-inspection.jpg",
  },
];

export function Services() {
  return (
    <section className="scroll-mt-20 py-24 bg-background">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead
          eyebrow="What we cover"
          title="Whatever your roof needs."
        />

        <div className="mt-16 lg:mt-20">
          {SERVICES.map((s, i) => {
            const flip = i % 2 === 1;
            return (
              <div key={s.title} className="grid items-center lg:grid-cols-2">
                <LandingImage
                  src={s.src}
                  alt={s.title}
                  className={cn("aspect-[4/3] w-full", flip && "lg:order-2")}
                />

                <div
                  className={cn(flip && "lg:order-1", "mt-8 lg:mt-0 lg:px-10")}
                >
                  <span className="font-sebenta text-sm font-bold text-foreground/25">
                    0{i + 1}
                  </span>
                  <h3 className="mt-2 font-sebenta text-[1.8rem] font-bold leading-tight tracking-tight sm:text-[2.1rem]">
                    {s.title}
                  </h3>
                  <p className="mt-3 max-w-md text-[16px] leading-relaxed text-foreground/60">
                    {s.body}
                  </p>
                  <Link
                    href="/get-a-quote"
                    className="group mt-12 inline-flex items-center gap-2 rounded-lg border-2 bg-primary px-7 py-2.5 text-base font-semibold text-background transition-colors"
                  >
                    Post a job
                    <SVGIcon
                      src="/icons/arrow-right.svg"
                      className="size-6 text-background transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
