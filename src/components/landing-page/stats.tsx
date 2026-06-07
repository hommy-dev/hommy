const STATS = [
  { n: "2,400+", l: "roofs sorted" },
  { n: "4.8★", l: "average rating" },
  { n: "< 1 hr", l: "to first reply" },
  { n: "100%", l: "licensed & insured" },
]

export function Stats() {
  return (
    <section className="bg-foreground py-20 text-background lg:py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-12 px-5 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.l}>
            <p className="font-sebenta text-5xl font-bold tracking-tight lg:text-[4rem]">
              {s.n}
            </p>
            <p className="mt-2 text-sm text-background/55">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
