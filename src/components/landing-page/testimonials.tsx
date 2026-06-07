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
      className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24 lg:py-32"
    >
      <SectionHead eyebrow="Reviews" title="Real homeowners. Real roofs." />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {REVIEWS.map((r) => (
          <figure
            key={r.name}
            className={cn(
              "flex flex-col rounded-2xl p-7",
              r.featured
                ? "bg-foreground text-background"
                : "border border-border bg-card text-foreground",
            )}
          >
            <Stars />
            <blockquote
              className={cn(
                "mt-5 flex-1 text-[15px] leading-relaxed",
                r.featured ? "font-sebenta text-xl font-medium leading-snug" : "text-foreground/80",
              )}
            >
              &ldquo;{r.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-full font-sebenta text-sm font-bold",
                  r.featured ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground/70",
                )}
              >
                {r.name.charAt(0)}
              </span>
              <span>
                <span className="block text-sm font-semibold">{r.name}</span>
                <span className={cn("block text-xs", r.featured ? "text-background/55" : "text-foreground/50")}>
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
