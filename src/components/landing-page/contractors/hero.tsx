import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";

// A roofer-at-work shot reads better here than a finished-home shot — this page
// speaks to the pro, not the homeowner. Swap the path to change it.
const HERO_IMAGE = "/bg/worker-1.webp";

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
      {/* Scrim so the white copy stays legible over any photo */}
      <div className="absolute inset-0 bg-foreground/55" />

      <div className="relative mx-auto flex min-h-screen lg:max-w-[70vw] flex-col items-center justify-center px-6 lg:px-[1.667vw] py-16 lg:py-[4.444vw] text-center text-background">
        <h1 className="font-sebenta text-[2.6rem] font-bold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.722vw]">
          Win more roofing jobs.
          <br />
          Only pay when you do.
        </h1>

        <p className="mt-5 lg:mt-[1.5vw] max-w-xl lg:max-w-[36vw] text-base leading-relaxed text-background lg:text-[1.25vw]">
          Get matched with homeowners near you, see every job for free, and pay a
          real fee only when you win the work. No lead packs, no monthly waste.
        </p>

        <div className="mt-12 lg:mt-[3.333vw] flex flex-col items-center gap-4 sm:flex-row lg:gap-[1.111vw]">
          <Link
            href="/auth/signup/contractor"
            className="group inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] border-2 border-primary bg-primary px-7 lg:px-[1.944vw] py-2.5 lg:py-[0.694vw] text-base lg:text-[1.111vw] font-semibold text-background transition-colors"
          >
            Register your company
            <Icon
              name="arrow-right"
              className="size-6 lg:size-[1.667vw] text-background transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center rounded-lg lg:rounded-[0.694vw] border-2 border-background/40 px-7 lg:px-[1.944vw] py-2.5 lg:py-[0.694vw] text-base lg:text-[1.111vw] font-semibold text-background transition-colors hover:border-background"
          >
            See how it works
          </Link>
        </div>

        <p className="mt-7 lg:mt-[2vw] text-sm lg:text-[0.972vw] font-medium text-background/80">
          $300 in free credits to start &middot; No monthly fees &middot; Cancel anytime
        </p>
      </div>
    </section>
  );
}
