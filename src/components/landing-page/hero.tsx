import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";

// ⬇ SWAP THIS for your real home/roof photo: drop it in public/bg/ and change
// this one path. A warm, slightly aspirational shot of a nice home/roof works best.
const HERO_IMAGE = "/bg/landing-page-hero.webp";

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden">
      <Image
        src={HERO_IMAGE}
        alt="A well-kept home with a freshly finished roof"
        fill
        priority
        sizes="100vw"
        className="object-bottom-left object-cover lg:object-bottom select-none"
      />

      <div
        id="quote"
        className="relative mx-auto flex min-h-screen lg:max-w-[70vw] flex-col items-center justify-center px-6 lg:px-[1.667vw] py-16 lg:py-[4.444vw] text-center text-background"
      >
        <h1 className="font-sebenta text-[2.6rem] font-bold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.722vw]">
          Find a roofer you can actually trust.
        </h1>

        <p className="mt-5 lg:mt-[1.5vw] max-w-xl lg:max-w-[34vw] text-base leading-relaxed text-background lg:text-[1.25vw]">
          Get free quotes from licensed and insured local roofers and only
          hear from the roofers you choose.
        </p>

        <Link
          href="/get-a-quote"
          className="group mt-12 lg:mt-[3.333vw] inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] border-2 bg-primary px-7 lg:px-[1.944vw] py-2.5 lg:py-[0.694vw] text-base lg:text-[1.111vw]  text-background transition-colors"
        >
          Post a job
          <Icon
            name="arrow-right"
            className="size-6 lg:size-[1.667vw] text-background transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </section>
  );
}
