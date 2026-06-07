import Link from "next/link"
import { Arrow } from "./shared"

export function ProCta() {
  return (
    <section className="mx-auto px-5 lg:px-[1.389vw] pb-20 lg:pb-[7.778vw]">
      <div className="grid items-center gap-8 lg:gap-[2.222vw] rounded-2xl lg:rounded-[1.111vw] border border-border bg-card px-7 lg:px-[1.944vw] py-12 lg:py-[3.333vw] sm:px-12 lg:grid-cols-[1.4fr_0.6fr]">
        <div>
          <span className="inline-flex items-center gap-2 lg:gap-[0.556vw] text-[11px] lg:text-[0.764vw] font-semibold uppercase tracking-[0.14em] text-foreground/45">
            <span className="size-1.5 lg:size-[0.417vw] rounded-full bg-primary" />
            Are you a roofer?
          </span>
          <h2 className="mt-4 lg:mt-[1.111vw] font-sebenta text-3xl lg:text-[2.083vw] font-bold leading-[1.1] tracking-tight sm:text-4xl">
            Real leads. No upfront cost.
          </h2>
          <p className="mt-4 lg:mt-[1.111vw] max-w-xl lg:max-w-[39.996vw] text-[16px] lg:text-[1.111vw] leading-relaxed text-foreground/65">
            Get matched with homeowners near you who actually need work done.
            Free to receive a lead — you only pay when you win the job. Plus a
            CRM built for how roofers really work.
          </p>
        </div>
        <div className="lg:justify-self-end">
          <Link
            href="/contractors"
            className="inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] bg-foreground px-6 lg:px-[1.667vw] py-3.5 lg:py-[0.972vw] text-sm lg:text-[0.972vw] font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Join as a pro
            <Arrow />
          </Link>
        </div>
      </div>
    </section>
  )
}
