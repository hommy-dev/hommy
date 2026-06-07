import { Eyebrow } from "./shared"

const FAQS = [
  {
    q: "Does it cost anything?",
    a: "No. Homei is free for homeowners — you never pay us a cent. Roofers pay us only when they win your job.",
  },
  {
    q: "Will I get spammed with calls?",
    a: "No. We share your job with a few vetted local roofers, not twenty. We never sell your number to a call center.",
  },
  {
    q: "How fast will I hear back?",
    a: "Usually within an hour. Matched roofers see your job the moment you post it and reach out directly.",
  },
  {
    q: "Are the roofers actually vetted?",
    a: "Every roofer shows us a valid license and proof of insurance before they can quote a single job.",
  },
  {
    q: "Do I have to hire anyone?",
    a: "Never. Compare the quotes, pick the one you like, or walk away. There's no obligation at any point.",
  },
]

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-canvas py-24 lg:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 font-sebenta text-[2rem] font-bold leading-[1.06] tracking-tight sm:text-[2.6rem]">
            Questions, answered.
          </h2>
        </div>

        <div className="border-t border-border">
          {FAQS.map((f) => (
            <details key={f.q} className="group border-b border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-semibold marker:hidden">
                {f.q}
                <span className="relative flex size-6 shrink-0 items-center justify-center rounded-full border border-foreground/20 text-foreground/60 transition-colors group-open:border-foreground group-open:bg-foreground group-open:text-background">
                  <span className="absolute h-[1.5px] w-2.5 bg-current" />
                  <span className="absolute h-2.5 w-[1.5px] bg-current transition-opacity group-open:opacity-0" />
                </span>
              </summary>
              <p className="max-w-xl pb-5 text-[15px] leading-relaxed text-foreground/60">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
