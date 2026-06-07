import Link from "next/link"
import { SectionHead, Arrow, Pill, AssetPlaceholder } from "./shared"

export function ServicesBento() {
  return (
    <section className="mx-auto px-5 lg:px-[1.389vw] py-24 lg:py-[8.889vw]">
      <SectionHead
        eyebrow="What we cover"
        title="Whatever your roof needs."
        sub="One roof, plenty of ways it can go wrong. There's a local pro for each of them."
      />

      <div className="mt-12 lg:mt-[3.333vw] grid auto-rows-[11rem] grid-cols-1 gap-4 lg:gap-[1.111vw] sm:grid-cols-2 lg:grid-cols-4">
        {/* Feature card — photo-led, spans 2×2 */}
        <Link
          href="/get-a-quote"
          className="group relative col-span-1 row-span-2 flex flex-col justify-end overflow-hidden rounded-2xl lg:rounded-[1.111vw] sm:col-span-2"
        >
          <AssetPlaceholder label="Roof repair photo" className="absolute inset-0 rounded-2xl lg:rounded-[1.111vw] border-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/40 to-transparent" />
          <div className="relative p-7 lg:p-[1.944vw] text-background">
            <Pill className="bg-background/15 text-background">Most common</Pill>
            <h3 className="mt-3 lg:mt-[0.833vw] font-sebenta text-2xl lg:text-[1.667vw] font-bold tracking-tight">Roof repair</h3>
            <p className="mt-2 lg:mt-[0.556vw] text-sm lg:text-[0.972vw] leading-relaxed text-background/80">
              Leaks, missing shingles, that nagging spot — sorted before it gets worse.
            </p>
            <span className="mt-4 lg:mt-[1.111vw] inline-flex items-center gap-1.5 lg:gap-[0.417vw] text-sm lg:text-[0.972vw] font-semibold">
              Get a quote
              <Arrow className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        {/* Lime — spans 2 wide */}
        <Link
          href="/get-a-quote"
          className="group col-span-1 flex flex-col justify-between rounded-2xl lg:rounded-[1.111vw] bg-secondary p-6 lg:p-[1.667vw] text-secondary-foreground transition-transform hover:-translate-y-0.5 sm:col-span-2"
        >
          <h3 className="font-sebenta text-xl lg:text-[1.389vw] font-bold tracking-tight">Full replacement</h3>
          <div>
            <p className="text-sm lg:text-[0.972vw] leading-relaxed text-secondary-foreground/70">
              When the old roof is done, get straight numbers from roofers who stand behind the work.
            </p>
            <span className="mt-3 lg:mt-[0.833vw] inline-flex items-center gap-1.5 lg:gap-[0.417vw] text-sm lg:text-[0.972vw] font-semibold">
              Get a quote
              <Arrow className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        {/* Dark */}
        <Link
          href="/get-a-quote"
          className="group flex flex-col justify-between rounded-2xl lg:rounded-[1.111vw] bg-foreground p-6 lg:p-[1.667vw] text-background transition-transform hover:-translate-y-0.5"
        >
          <h3 className="font-sebenta text-xl lg:text-[1.389vw] font-bold tracking-tight">Storm damage</h3>
          <span className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] text-sm lg:text-[0.972vw] font-semibold text-background/80">
            Get a quote
            <Arrow className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        {/* White */}
        <Link
          href="/get-a-quote"
          className="group flex flex-col justify-between rounded-2xl lg:rounded-[1.111vw] border border-border bg-card p-6 lg:p-[1.667vw] text-foreground transition-transform hover:-translate-y-0.5"
        >
          <h3 className="font-sebenta text-xl lg:text-[1.389vw] font-bold tracking-tight">Inspection</h3>
          <span className="inline-flex items-center gap-1.5 lg:gap-[0.417vw] text-sm lg:text-[0.972vw] font-semibold text-foreground/70">
            Get a quote
            <Arrow className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </section>
  )
}
