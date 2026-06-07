import { Eyebrow } from "./shared"

export function Statement() {
  return (
    <section className="mx-auto px-5 lg:px-[1.389vw] py-24 lg:py-[8.889vw]">
      <div className="flex items-baseline justify-between gap-6 lg:gap-[1.667vw]">
        <Eyebrow>Why Homei</Eyebrow>
        <span className="font-sebenta text-sm lg:text-[0.972vw] text-foreground/30">/ 01</span>
      </div>
      <p className="mt-8 lg:mt-[2.222vw] max-w-4xl lg:max-w-[62.216vw] font-sebenta text-[1.9rem] lg:text-[2.111vw] font-bold leading-[1.22] tracking-tight sm:text-[2.6rem] sm:leading-[1.2]">
        Hiring a roofer shouldn&rsquo;t feel like a gamble. We line up a few{" "}
        <span className="text-primary">licensed, insured</span> local pros, you
        compare real quotes, and you only ever deal with people who{" "}
        <span className="bg-secondary px-1.5 lg:px-[0.417vw] text-secondary-foreground">
          actually show up.
        </span>
      </p>
    </section>
  )
}
