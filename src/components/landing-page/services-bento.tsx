import Link from "next/link"
import { SectionHead, Arrow, Pill, AssetPlaceholder } from "./shared"

export function ServicesBento() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
      <SectionHead
        eyebrow="What we cover"
        title="Whatever your roof needs."
        sub="One roof, plenty of ways it can go wrong. There's a local pro for each of them."
      />

      <div className="mt-12 grid auto-rows-[11rem] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Feature card — photo-led, spans 2×2 */}
        <Link
          href="/get-a-quote"
          className="group relative col-span-1 row-span-2 flex flex-col justify-end overflow-hidden rounded-2xl sm:col-span-2"
        >
          <AssetPlaceholder label="Roof repair photo" className="absolute inset-0 rounded-2xl border-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/40 to-transparent" />
          <div className="relative p-7 text-background">
            <Pill className="bg-background/15 text-background">Most common</Pill>
            <h3 className="mt-3 font-sebenta text-2xl font-bold tracking-tight">Roof repair</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-background/80">
              Leaks, missing shingles, that nagging spot — sorted before it gets worse.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
              Get a quote
              <Arrow className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        {/* Lime — spans 2 wide */}
        <Link
          href="/get-a-quote"
          className="group col-span-1 flex flex-col justify-between rounded-2xl bg-secondary p-6 text-secondary-foreground transition-transform hover:-translate-y-0.5 sm:col-span-2"
        >
          <h3 className="font-sebenta text-xl font-bold tracking-tight">Full replacement</h3>
          <div>
            <p className="text-sm leading-relaxed text-secondary-foreground/70">
              When the old roof is done, get straight numbers from roofers who stand behind the work.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
              Get a quote
              <Arrow className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        {/* Dark */}
        <Link
          href="/get-a-quote"
          className="group flex flex-col justify-between rounded-2xl bg-foreground p-6 text-background transition-transform hover:-translate-y-0.5"
        >
          <h3 className="font-sebenta text-xl font-bold tracking-tight">Storm damage</h3>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-background/80">
            Get a quote
            <Arrow className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        {/* White */}
        <Link
          href="/get-a-quote"
          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 text-foreground transition-transform hover:-translate-y-0.5"
        >
          <h3 className="font-sebenta text-xl font-bold tracking-tight">Inspection</h3>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/70">
            Get a quote
            <Arrow className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </section>
  )
}
