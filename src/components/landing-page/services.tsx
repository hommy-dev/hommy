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
    <section className="scroll-mt-20 lg:scroll-mt-[5.556vw] py-24 lg:py-[6.667vw] bg-background">
      <div className="mx-auto px-5 lg:px-[1.389vw]">
        <SectionHead
          eyebrow="What we cover"
          title="Whatever your roof needs."
        />

        <div className="mt-16 lg:mt-[5.556vw]">
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
                  className={cn(flip && "lg:order-1", "mt-8 lg:mt-0 lg:px-[2.778vw]")}
                >
                  <span className="font-sebenta text-sm lg:text-[0.972vw] font-bold text-foreground/25">
                    0{i + 1}
                  </span>
                  <h3 className="mt-2 lg:mt-[0.556vw] font-sebenta text-[1.8rem] lg:text-[2vw] font-bold leading-tight tracking-tight sm:text-[2.1rem]">
                    {s.title}
                  </h3>
                  <p className="mt-3 lg:mt-[0.833vw] max-w-md lg:max-w-[31.108vw] text-[16px] lg:text-[1.111vw] leading-relaxed text-foreground/60">
                    {s.body}
                  </p>
                  <Link
                    href="/get-a-quote"
                    className="group mt-12 lg:mt-[3.333vw] inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] border-2 bg-primary px-7 lg:px-[1.944vw] py-2.5 lg:py-[0.694vw] text-base lg:text-[1.111vw] font-semibold text-background transition-colors"
                  >
                    Post a job
                    <SVGIcon
                      src="/icons/arrow-right.svg"
                      className="size-6 lg:size-[1.667vw] text-background transition-transform group-hover:translate-x-0.5"
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
