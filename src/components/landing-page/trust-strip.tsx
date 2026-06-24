const STATS = [
  {
    label: "Hear back in",
    value: "24h",
    desc: "Most homeowners hear from a roofer within the hour of posting.",
  },
  {
    label: "Always",
    value: "100%",
    desc: "Every roofer is licensed and insured, and we check it before they can quote.",
  },
  {
    label: "You pay",
    value: "Free",
    desc: "Free for homeowners. No fees, no catch, no obligation, ever.",
  },
];

export function TrustStrip() {
  return (
    <section className="bg-background">
      <div className="lg:max-w-[95vw] mx-auto px-5 lg:px-[1.389vw] py-24 lg:py-[8.889vw]">
        <div className="">
          <h2 className="font-sebenta text-3xl md:text-4xl lg:text-[3.333vw] font-semibold  tracking-tight">
            A better way to hire a roofer.
          </h2>
          <p className="mt-2 lg:mt-[0.556vw] font-medium text-base lg:text-[1.2vw] leading-relaxed text-muted-foreground">
            A handful of vetted local pros. Real quotes. Zero pressure.
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
              <p className="mt-6 lg:mt-[1.667vw] leading-relaxed text-muted-foreground lg:text-[1.111vw]">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
