import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";

// A roofer-at-work shot reads better here than a finished-home shot — this page
// speaks to the pro, not the homeowner. Swap the path to change it.
const HERO_IMAGE = "/bg/roofers.webp";

export function ContractorHero() {
  return (
    <section className="relative w-full overflow-hidden">
      <Image
        src={HERO_IMAGE}
        alt="A professional roofer working on a roof"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      <div className="relative mx-auto flex min-h-screen lg:max-w-[70vw] flex-col items-center justify-center px-6 lg:px-[1.667vw] py-16 lg:py-[4.444vw] text-center text-background">
        <h1 className="font-sebenta text-[2rem] font-bold leading-[125%] lg:leading-[1.1] sm:text-5xl lg:text-[3.4vw]">
          Win more roofing jobs.
          <br className="hidden sm:block" />
          {` `}Only pay when you win.
        </h1>

        <p className="mt-4 lg:mt-[2vw] max-w-md lg:max-w-[26vw] text-base leading-relaxed text-background lg:text-[1.111vw] font-medium">
          See every nearby job free. Pay only when you win. $300 in free credits
          to start &middot; No monthly fees &middot; Cancel anytime
        </p>

        <div className="mt-12 lg:mt-[3vw] flex flex-col items-center gap-4 sm:flex-row lg:gap-[1.111vw]">
          <Link
            href="/auth/signup/contractor"
            className="group inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] border-2 border-background bg-primary px-7 lg:px-[1.944vw] py-2.5 lg:py-[0.694vw] text-base lg:text-[1.111vw] text-background transition-colors"
          >
            Register your company
            <Icon
              name="arrow-right"
              className="size-4 lg:size-[1.4vw] text-background transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
