import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getStormById } from "@/lib/data/storms"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"

const LABEL: Record<string, string> = { hail: "Hail", high_wind: "High wind", storm: "Storm" }

function whereOf(storm: { city: string | null; state: string | null }): string {
  return [storm.city, storm.state].filter(Boolean).join(", ") || "your area"
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const storm = await getStormById(id)
  if (!storm) return { title: "Storm damage roofing" }
  const where = whereOf(storm)
  return {
    title: `${LABEL[storm.eventType] ?? "Storm"} damage in ${where}? Get vetted local roofers — Hommy`,
    description:
      "Roof damage after the storm? Post once and get matched with licensed, insured local roofers. Free, no obligation, no spam calls.",
    // Per-storm pages are time-bound — keep them out of the index to avoid thin/duplicate SEO.
    robots: { index: false, follow: true },
  }
}

export default async function StormLandingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const storm = await getStormById(id)
  if (!storm) notFound()

  const where = whereOf(storm)
  const label = LABEL[storm.eventType] ?? "Storm"
  const quoteHref = `/get-a-quote?storm=${storm.id}`

  return (
    <section className="mx-auto w-full max-w-3xl lg:max-w-[60vw] px-6 lg:px-[1.667vw] py-16 lg:py-[6vw] text-center">
      <span className="inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-full bg-warning-bg px-3 lg:px-[0.833vw] py-1 lg:py-[0.278vw] text-xs lg:text-[0.833vw] font-medium text-warning">
        <Icon name="storm" className="size-4 lg:size-[1.111vw]" />
        {label} damage reported{storm.severity ? ` · ${storm.severity}` : ""}
      </span>

      <h1 className="mt-5 lg:mt-[1.389vw] font-sebenta text-4xl lg:text-[3.2vw] font-bold leading-[1.05] tracking-tight">
        {label} hit {where}.<br />
        Get your roof checked by a vetted local roofer.
      </h1>

      <p className="mx-auto mt-5 lg:mt-[1.389vw] max-w-xl lg:max-w-[34vw] text-base lg:text-[1.05vw] leading-relaxed text-muted-foreground">
        Post your roof once and get matched with licensed, insured roofers near you who handle
        storm-damage and insurance claims. Free, no obligation — and <span className="text-foreground font-medium">no getting spam-called by six companies.</span>
      </p>

      <div className="mt-8 lg:mt-[2.222vw]">
        <Button asChild size="lg" className="px-8 lg:px-[2.8vw] text-base lg:text-[1.05vw] font-semibold">
          <Link href={quoteHref}>Get my free quote</Link>
        </Button>
      </div>

      <ul className="mx-auto mt-10 lg:mt-[2.778vw] grid max-w-lg lg:max-w-[30vw] gap-3 lg:gap-[0.833vw] text-left">
        {[
          "Licensed & insured roofers only",
          "You choose who you talk to",
          "Free to post — pay nothing for quotes",
          "Built for storm-damage & insurance claims",
        ].map((t) => (
          <li key={t} className="flex items-center gap-2.5 lg:gap-[0.694vw] text-sm lg:text-[0.972vw]">
            <Icon name="tick-square" className="size-5 lg:size-[1.25vw] shrink-0 text-success" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
