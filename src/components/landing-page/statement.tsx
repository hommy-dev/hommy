import { Eyebrow } from "./shared"

export function Statement() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
      <div className="flex items-baseline justify-between gap-6">
        <Eyebrow>Why Homei</Eyebrow>
        <span className="font-sebenta text-sm text-foreground/30">/ 01</span>
      </div>
      <p className="mt-8 max-w-4xl font-sebenta text-[1.9rem] font-bold leading-[1.22] tracking-tight sm:text-[2.6rem] sm:leading-[1.2]">
        Hiring a roofer shouldn&rsquo;t feel like a gamble. We line up a few{" "}
        <span className="text-primary">licensed, insured</span> local pros, you
        compare real quotes, and you only ever deal with people who{" "}
        <span className="bg-secondary px-1.5 text-secondary-foreground">
          actually show up.
        </span>
      </p>
    </section>
  )
}
