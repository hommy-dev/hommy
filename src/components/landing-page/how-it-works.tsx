import { LandingImage, Arrow } from "./shared";

const STEPS = [
  {
    step: "Step one",
    title: "Tell us about your roof",
    asset: "Form illustration",
  },
  {
    step: "Step two",
    title: "We match local pros",
    asset: "Matching illustration",
  },
  {
    step: "Step three",
    title: "Compare & pick",
    asset: "Quotes illustration",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-5">
        {/* centered head */}
        <div className="flex flex-col items-center text-center">
          <h2 className="mt-6 font-sebenta text-[2.2rem] font-bold leading-[1.08] tracking-tight sm:text-[2.8rem]">
            Here's How it works
          </h2>
          <p className="max-w-md mx-auto  mt-2 font-medium leading-relaxed text-muted-foreground">
            Post your job in minutes and get quotes from verified local roofers.
            You compare, you choose, no pressure.
          </p>
        </div>

        {/* one connected panel, divided into the steps */}
        <div className="mt-14 grid divide-y divide-border overflow-hidden rounded-lg bg-card lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {STEPS.map((s, i) => (
            <div key={s.step} className="relative flex flex-col p-6 lg:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
                {s.step}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>

              <LandingImage
                alt={s.title}
                className="mt-5 aspect-[4/3] w-full rounded-md"
              />


              {/* arrow connector sitting on the divider */}
              {i < STEPS.length - 1 ? (
                <span className="absolute right-0 top-1/2 z-10 hidden size-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border bg-canvas text-foreground/50 lg:flex">
                  <Arrow />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
