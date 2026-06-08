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
      <div className="lg:max-w-[90vw] mx-auto px-5 lg:px-[1.389vw] py-24 lg:py-[8.889vw]">
        <div className="">
          <h2 className="font-sebenta text-[2.3rem] lg:text-[2.555vw] font-bold leading-[1.06] tracking-tight sm:text-5xl">
            A better way to hire a roofer.
          </h2>
          <p className="mt-2 lg:mt-[0.556vw] font-medium leading-relaxed text-foreground/55">
            A few vetted local pros, real quotes, zero pressure.
          </p>
        </div>

        <div className="mt-8 lg:mt-[2.222vw] grid gap-4 lg:gap-[1.111vw] sm:grid-cols-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col rounded-md lg:rounded-[0.556vw] bg-canvas p-7 lg:p-[1.944vw]"
            >
              <p className="text-base lg:text-[1.111vw] font-semibold text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-2 lg:mt-[0.556vw] font-sebenta text-primary text-[4rem] lg:text-[4.444vw] font-bold leading-none tracking-tight">
                {s.value}
              </p>
              <p className="mt-6 lg:mt-[1.667vw] leading-relaxed text-muted-foreground">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
