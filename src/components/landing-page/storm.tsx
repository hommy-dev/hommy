import Link from "next/link"
import { Eyebrow, Arrow, LandingImage } from "./shared"

export function Storm() {
  return (
    <section className="mx-auto px-5 lg:px-[1.389vw] pb-4 lg:pb-[1.111vw]">
      <div className="grid overflow-hidden rounded-2xl lg:rounded-[1.111vw] bg-primary text-primary-foreground lg:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-[3.889vw]">
          <Eyebrow className="text-secondary">Storm season</Eyebrow>
          <h2 className="mt-4 lg:mt-[1.111vw] font-sebenta text-3xl lg:text-[2.083vw] font-bold leading-[1.1] tracking-tight sm:text-4xl">
            When a storm hits, don&rsquo;t get left scrambling.
          </h2>
          <p className="mt-4 lg:mt-[1.111vw] max-w-md lg:max-w-[31.108vw] text-[16px] lg:text-[1.111vw] leading-relaxed text-primary-foreground/75">
            We watch severe weather in your area. The moment hail or high wind
            rolls through, we connect you with roofers who handle storm damage
            and know the insurance side.
          </p>
          <Link
            href="/get-a-quote"
            className="group mt-7 lg:mt-[1.944vw] inline-flex w-fit items-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] bg-secondary px-5 lg:px-[1.389vw] py-3 lg:py-[0.833vw] text-sm lg:text-[0.972vw] font-semibold text-secondary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Check my area
            <Arrow className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <LandingImage alt="Storm-season roofing" className="min-h-[18rem] lg:min-h-[19.998vw]" />
      </div>
    </section>
  )
}
