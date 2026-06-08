import { SVGIcon } from "../ui/svg-icon";
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
    <section
      id="how-it-works"
      className="scroll-mt-20 lg:scroll-mt-[5.556vw] py-24 lg:py-[6.667vw]"
    >
      <div className="max-w-[90vw] mx-auto px-5 lg:px-[1.389vw]">
        {/* centered head */}
        <div className="flex flex-col items-center text-center">
          <h2 className="mt-6 lg:mt-[1.667vw] font-sebenta text-[2.2rem] lg:text-[2.444vw] font-bold leading-[1.08] tracking-tight sm:text-[2.8rem]">
            Here's How it works
          </h2>
          <p className="mx-auto mt-2 lg:mt-[0.556vw] max-w-md lg:max-w-[31.108vw] text-base lg:text-[1vw] font-medium leading-relaxed text-muted-foreground">
            Post your job in minutes and get quotes from verified local roofers.
            You compare, you choose, no pressure.
          </p>
        </div>

        {/* one connected panel, divided into the steps */}
        <div className="mt-14 lg:mt-[3.889vw] grid divide-y divide-border-dashaed border border-dashed overflow-hidden rounded-lg lg:rounded-[0.5vw] bg-card lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {STEPS.map((s, i) => (
            <div key={s.step} className="relative flex flex-col">
              <div className="p-6 lg:p-[1.944vw]">
                <p className="text-[11px] lg:text-[0.764vw] font-semibold uppercase tracking-wider text-foreground/40">
                  {s.step}
                </p>
                <h3 className="mt-1 lg:mt-[0.278vw] text-lg lg:text-[1.25vw] font-semibold">
                  {s.title}
                </h3>
              </div>

              <LandingImage
                alt={s.title}
                className="mt-5 lg:mt-[1.389vw] aspect-[4/3] w-full"
              />

              {/* arrow connector sitting on the divider */}
              {i < STEPS.length - 1 ? (
                <span className="absolute right-0 top-1/2 z-10 hidden p-2 lg:p-[0.3vw]  -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-foreground/60 text-background lg:flex">
                  <SVGIcon
                    src="/icons/right.svg"
                    className="w-4 h-4 size-6 lg:size-[1.5vw]"
                  />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
