import { cn } from "@/lib/utils"
import { SectionHead, Stars } from "./shared"

const REVIEWS = [
  {
    quote:
      "I had three roofers out by the next afternoon. I went with the one who actually explained things instead of talking over my head. New roof in a week.",
    name: "Maria A.",
    city: "Dallas, TX",
    featured: true,
  },
  {
    quote:
      "Leak in the middle of a storm and no clue who to call. Homei had someone at the house the next morning. No drama.",
    name: "James C.",
    city: "Fort Worth, TX",
  },
  {
    quote:
      "I dreaded the spam, so I kept putting off quotes. This was just two local roofers, both solid, both upfront.",
    name: "Priya N.",
    city: "Plano, TX",
  },
]

export function Testimonials() {
  return (
    <section
      id="reviews"
      className="mx-auto scroll-mt-20 lg:scroll-mt-[5.556vw] px-5 lg:px-[1.389vw] py-24 lg:py-[8.889vw]"
    >
      <SectionHead eyebrow="Reviews" title="Real homeowners. Real roofs." />
      <div className="mt-12 lg:mt-[3.333vw] grid gap-4 lg:gap-[1.111vw] md:grid-cols-3">
        {REVIEWS.map((r) => (
          <figure
            key={r.name}
            className={cn(
              "flex flex-col rounded-2xl lg:rounded-[1.111vw] p-7 lg:p-[1.944vw]",
              r.featured
                ? "bg-foreground text-background"
                : "border border-border bg-card text-foreground",
            )}
          >
            <Stars />
            <blockquote
              className={cn(
                "mt-5 lg:mt-[1.389vw] flex-1 text-[15px] lg:text-[1.042vw] leading-relaxed",
                r.featured ? "font-sebenta text-xl lg:text-[1.389vw] font-medium leading-snug" : "text-foreground/80",
              )}
            >
              &ldquo;{r.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 lg:mt-[1.667vw] flex items-center gap-3 lg:gap-[0.833vw]">
              <span
                className={cn(
                  "flex size-10 lg:size-[2.778vw] items-center justify-center rounded-full font-sebenta text-sm lg:text-[0.972vw] font-bold",
                  r.featured ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground/70",
                )}
              >
                {r.name.charAt(0)}
              </span>
              <span>
                <span className="block text-sm lg:text-[0.972vw] font-semibold">{r.name}</span>
                <span className={cn("block text-xs lg:text-[0.833vw]", r.featured ? "text-background/55" : "text-foreground/50")}>
                  {r.city}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
