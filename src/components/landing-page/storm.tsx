import Link from "next/link";
import { Arrow, LandingImage } from "./shared";
import { SVGIcon } from "../ui/svg-icon";

export function Storm() {
  return (
    <section className="lg:max-w-[90vw] mx-auto px-5 lg:px-[1.389vw] py-24 lg:py-[8.889vw]">
      <div className="grid overflow-hidden rounded-lg lg:rounded-[0.5vw] bg-primary text-primary-foreground lg:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-[3.889vw]">
          <h2 className="mt-4 lg:mt-[1.111vw] font-sebenta text-3xl lg:text-[2.083vw] font-bold leading-[1.1] tracking-tight sm:text-4xl">
            When a storm hits, don&rsquo;t get left scrambling.
          </h2>
          <p className="mt-4 lg:mt-[1.111vw] max-w-md lg:max-w-[31.108vw] text-[16px] lg:text-[1.2vw] leading-relaxed font-semibold text-background/90">
            We watch severe weather in your area. The moment hail or high wind
            rolls through, we connect you with roofers who handle storm damage
            and know the insurance side.
          </p>
          <Link
            href="/get-a-quote"
            className="w-fit group mt-12 lg:mt-[3.333vw] inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] border-2 bg-primary px-7 lg:px-[1.944vw] py-2.5 lg:py-[0.694vw] text-base lg:text-[1.111vw]  text-background transition-colors"
          >
            Get a quote
            <SVGIcon
              src="/icons/arrow-right.svg"
              className="size-6 lg:size-[1.667vw] text-background transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <LandingImage
          alt="Storm-season roofing"
          className="min-h-[18rem] lg:min-h-[19.998vw]"
        />
      </div>
    </section>
  );
}
