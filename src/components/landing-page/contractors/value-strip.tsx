const STATS = [
  {
    label: "Receive leads",
    value: "Free",
    desc: "Every matching job in your area shows up at no cost. Look before you ever spend a credit.",
  },
  {
    label: "Pay only when you",
    value: "Win",
    desc: "A small fee, charged only when the homeowner accepts your quote. No win, no fee, ever.",
  },
  {
    label: "Start with",
    value: "$300",
    desc: "in free credits when you join. Enough to win several jobs before you spend a dollar of your own.",
  },
];

export function ContractorValueStrip() {
  return (
    <section className="bg-background">
      <div className="lg:max-w-[95vw] mx-auto px-5 lg:px-[1.389vw] py-24 lg:py-[8.889vw]">
        <div>
          <h2 className="font-sebenta text-3xl md:text-4xl lg:text-[3.333vw] font-semibold tracking-tight">
            Leads that don&rsquo;t cost you upfront.
          </h2>
          <p className="mt-2 lg:mt-[0.556vw] font-medium text-base lg:text-[1.2vw] leading-relaxed text-muted-foreground">
            Real jobs from homeowners nearby. You only spend when it&rsquo;s worth your time.
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
              <p className="mt-2 lg:mt-[0.556vw] font-sebenta text-primary text-[3rem] lg:text-[4vw] font-bold leading-none tracking-tight">
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
