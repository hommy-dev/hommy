import Link from "next/link"
import { Eyebrow, Arrow, LandingImage } from "./shared"

export function Storm() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-4">
      <div className="grid overflow-hidden rounded-2xl bg-primary text-primary-foreground lg:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
          <Eyebrow className="text-secondary">Storm season</Eyebrow>
          <h2 className="mt-4 font-sebenta text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
            When a storm hits, don&rsquo;t get left scrambling.
          </h2>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-primary-foreground/75">
            We watch severe weather in your area. The moment hail or high wind
            rolls through, we connect you with roofers who handle storm damage
            and know the insurance side.
          </p>
          <Link
            href="/get-a-quote"
            className="group mt-7 inline-flex w-fit items-center gap-2 rounded-lg bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Check my area
            <Arrow className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <LandingImage alt="Storm-season roofing" className="min-h-[18rem]" />
      </div>
    </section>
  )
}
