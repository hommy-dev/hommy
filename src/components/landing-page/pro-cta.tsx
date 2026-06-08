import Link from "next/link";
import { SVGIcon } from "../ui/svg-icon";

export function ProCta() {
  return (
    <section className=" px-5 lg:px-[1.389vw] bg-background pb-20 lg:pb-[7.778vw]">
      <div className="max-w-[70vw] mx-auto bg-primary rounded-lg lg:rounded-[1vw] border border-border px-7 lg:px-[1.944vw] py-12 lg:py-[7vw] sm:px-12 flex items-center flex-col text-center
      bg-[url('/bg/test.jpg')] bg-cover bg-center
      ">
        <h2 className="mt-4 lg:mt-[1.111vw] font-sebenta text-3xl lg:text-[2.5vw] font-bold leading-[1.1] tracking-tight sm:text-4xl text-background">
          Real leads. No upfront cost.
        </h2>
        <p className="mt-4 lg:mt-[1.111vw] max-w-xl lg:max-w-[39.996vw] text-[16px] lg:text-[1.111vw] leading-relaxed font-medium text-background">
          Built for roofers who want real jobs, not wasted calls. Get matched
          with local homeowners, receive leads free, and only pay when you win.
        </p>
        <Link
          href="/get-a-quote"
          className="group mt-8 lg:mt-[3vw] inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] border-2 bg-primary px-7 lg:px-[1.944vw] py-2.5 lg:py-[0.694vw] text-base lg:text-[1.111vw]  text-background transition-colors"
        >
          Registered your Company
          <SVGIcon
            src="/icons/arrow-right.svg"
            className="size-6 lg:size-[1.667vw] text-background transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </section>
  );
}
