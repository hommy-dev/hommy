import { Check } from "../shared";

const OLD_WAY = [
  "Pay upfront for every lead, win or lose",
  "The same lead sold to four other roofers",
  "Race to call first or lose the job",
  "Pay just to be “considered”",
  "Their platform, their reviews, your data",
];

const HOMMY_WAY = [
  "See every matching lead for free",
  "Just $1 to start the conversation",
  "A real fee only when you win the job",
  "Homeowners pick on quality, not who called first",
  "Your profile, your reviews, your CRM",
];

function Cross() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="size-5 lg:size-[1.389vw] shrink-0 text-muted-foreground/60"
    >
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ContractorDifference() {
  return (
    <section className="bg-background px-5 lg:px-[1.389vw] py-24 lg:py-[8.889vw]">
      <div className="lg:max-w-[95vw] mx-auto">
        <div className="max-w-2xl lg:max-w-[46.662vw]">
          <h2 className="font-sebenta text-3xl md:text-4xl lg:text-[3.333vw] font-semibold tracking-tight">
            A fairer deal for roofers.
          </h2>
          <p className="mt-4 lg:mt-[1.111vw] text-[17px] lg:text-[1.181vw] leading-relaxed text-muted-foreground">
            The old lead-gen model is built to charge you no matter what happens.
            Hommy is built around the work you actually win.
          </p>
        </div>

        <div className="mt-10 lg:mt-[2.778vw] grid gap-4 lg:gap-[1.111vw] lg:grid-cols-2">
          {/* Old way */}
          <div className="flex flex-col rounded-lg lg:rounded-[0.833vw] bg-canvas p-8 lg:p-[2.222vw] ring-1 ring-foreground/10">
            <p className="text-sm lg:text-[0.972vw] font-semibold uppercase tracking-wider text-muted-foreground">
              Old-school lead gen
            </p>
            <ul className="mt-6 lg:mt-[1.667vw] flex flex-col gap-4 lg:gap-[1.111vw]">
              {OLD_WAY.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 lg:gap-[0.833vw] text-base lg:text-[1.111vw] leading-relaxed text-muted-foreground"
                >
                  <Cross />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Hommy way — emphasized */}
          <div className="flex flex-col rounded-lg lg:rounded-[0.833vw] bg-foreground p-8 lg:p-[2.222vw] text-background">
            <p className="text-sm lg:text-[0.972vw] font-semibold uppercase tracking-wider text-background/60">
              With Hommy
            </p>
            <ul className="mt-6 lg:mt-[1.667vw] flex flex-col gap-4 lg:gap-[1.111vw]">
              {HOMMY_WAY.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 lg:gap-[0.833vw] text-base lg:text-[1.111vw] font-medium leading-relaxed"
                >
                  <span className="grid size-5 lg:size-[1.389vw] shrink-0 place-items-center rounded-full bg-primary text-background">
                    <Check className="size-3 lg:size-[0.833vw]" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
