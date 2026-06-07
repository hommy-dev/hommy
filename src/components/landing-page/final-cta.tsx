import Link from "next/link"
import { Arrow } from "./shared"

export function FinalCta() {
  return (
    <section className="px-4 pb-4 sm:px-5">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-secondary px-6 pt-20 text-center text-secondary-foreground lg:pt-28">
        <h2 className="mx-auto max-w-2xl font-sebenta text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          Ready for a roof you can trust?
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-secondary-foreground/70">
          A few vetted local roofers, matched to your job. Free to post, no pressure.
        </p>
        <Link
          href="/get-a-quote"
          className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-foreground px-7 py-3.5 text-base font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Post a job
          <Arrow className="transition-transform group-hover:translate-x-0.5" />
        </Link>

        {/* Oversized wordmark anchored to the bottom edge */}
        <p
          aria-hidden
          className="pointer-events-none mt-12 select-none font-sebenta text-[24vw] font-bold leading-[0.72] tracking-tighter text-secondary-foreground/10 lg:text-[15rem]"
        >
          Homei
        </p>
      </div>
    </section>
  )
}
