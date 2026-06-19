import Link from "next/link";
import { Icon } from "../ui/icon";

export function FinalCta() {
  return (
    <section className="px-4 lg:px-[1.111vw] pb-4 lg:pb-[1.111vw] sm:px-5">
      <div className="relative max-w-[90vw] mx-auto overflow-hidden rounded-2xl lg:rounded-[1.111vw] bg-secondary px-6 lg:px-[1.667vw] pt-20 text-center text-secondary-foreground lg:pt-[7.778vw]">
        <h2 className="mx-auto max-w-2xl lg:max-w-[46.662vw] font-sebenta text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[4.167vw]">
          Ready for a roof you can trust?
        </h2>
        <p className="mx-auto mt-5 lg:mt-[1.389vw] max-w-md lg:max-w-[31.108vw] text-[17px] lg:text-[1.181vw] leading-relaxed text-secondary-foreground/70">
          A few vetted local roofers, matched to your job. Free to post, no
          pressure.
        </p>
        <Link
          href="/get-a-quote"
          className="group mt-12 lg:mt-[3.333vw] inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] border-2 bg-foreground px-7 lg:px-[1.944vw] py-2.5 lg:py-[0.694vw] text-base lg:text-[1.111vw]  text-background transition-colors"
        >
          Post a job
          <Icon
            name="arrow-right"
            className="size-6 lg:size-[1.667vw] text-background transition-transform group-hover:translate-x-0.5"
          />
        </Link>

        {/* Oversized wordmark anchored to the bottom edge */}
        <p
          aria-hidden
          className="pointer-events-none mt-12 lg:mt-[3.333vw] select-none font-sebenta text-[24vw] font-bold leading-[0.72] tracking-tighter text-secondary-foreground/10 lg:text-[16vw]"
        >
          Homei
        </p>
      </div>
    </section>
  );
}
