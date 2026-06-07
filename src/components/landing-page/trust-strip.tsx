const STATS = [
  {
    label: "Hear back in",
    value: "24h",
    desc: "Most homeowners get their first reply within the hour.",
  },
  {
    label: "Always",
    value: "100%",
    desc: "Licensed & insured roofers — checked before they can quote.",
  },
  {
    label: "You pay",
    value: "Free",
    desc: "Free for homeowners. No fees, no obligation, ever.",
  },
];

export function TrustStrip() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
        <div className="">
          <h2 className="font-sebenta text-[2.3rem] font-bold leading-[1.06] tracking-tight sm:text-5xl">
            A better way to hire a roofer.
          </h2>
          <p className="mt-2 font-medium leading-relaxed text-foreground/55">
            A few vetted local pros, real quotes, zero pressure.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col rounded-md bg-canvas p-7"
            >
              <p className="text-base font-semibold text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-2 font-sebenta text-primary text-[4rem] font-bold leading-none tracking-tight">
                {s.value}
              </p>
              <p className="mt-6 leading-relaxed text-muted-foreground">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
