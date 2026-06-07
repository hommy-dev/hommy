import Link from "next/link"
import { Arrow } from "./shared"

export function ProCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 lg:pb-28">
      <div className="grid items-center gap-8 rounded-2xl border border-border bg-card px-7 py-12 sm:px-12 lg:grid-cols-[1.4fr_0.6fr]">
        <div>
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
            <span className="size-1.5 rounded-full bg-primary" />
            Are you a roofer?
          </span>
          <h2 className="mt-4 font-sebenta text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
            Real leads. No upfront cost.
          </h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-foreground/65">
            Get matched with homeowners near you who actually need work done.
            Free to receive a lead — you only pay when you win the job. Plus a
            CRM built for how roofers really work.
          </p>
        </div>
        <div className="lg:justify-self-end">
          <Link
            href="/contractors"
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3.5 text-sm font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Join as a pro
            <Arrow />
          </Link>
        </div>
      </div>
    </section>
  )
}
