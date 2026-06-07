const STATS = [
  { n: "2,400+", l: "roofs sorted" },
  { n: "4.8★", l: "average rating" },
  { n: "< 1 hr", l: "to first reply" },
  { n: "100%", l: "licensed & insured" },
]

export function Stats() {
  return (
    <section className="bg-foreground py-20 text-background lg:py-[6.667vw]">
      <div className="mx-auto grid grid-cols-2 gap-x-6 lg:gap-x-[1.667vw] gap-y-12 lg:gap-y-[3.333vw] px-5 lg:px-[1.389vw] lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.l}>
            <p className="font-sebenta text-5xl font-bold tracking-tight lg:text-[4.444vw]">
              {s.n}
            </p>
            <p className="mt-2 lg:mt-[0.556vw] text-sm lg:text-[0.972vw] text-background/55">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
