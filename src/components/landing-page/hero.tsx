import Link from "next/link";
import Image from "next/image";
import { LogoMarquee } from "@/components/public/logo-marquee";
import { SVGIcon } from "@/components/ui/svg-icon";

// ⬇ SWAP THIS for your real home/roof photo: drop it in public/bg/ and change
// this one path. A warm, slightly aspirational shot of a nice home/roof works best.
const HERO_IMAGE = "/bg/landing-page-hero.jpeg";

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden">
      <Image
        src={HERO_IMAGE}
        alt="A well-kept home with a freshly finished roof"
        fill
        priority
        sizes="100vw"
        className="object-bottom-left object-cover lg:object-bottom"
      />

      <div
        id="quote"
        className="relative mx-auto flex min-h-screen lg:max-w-[70vw] flex-col items-center justify-center px-6 lg:px-[1.667vw] py-16 lg:py-[4.444vw] text-center text-background"
      >
        <h1 className="font-sebenta text-[2.6rem] font-bold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.722vw]">
          Find a roofer you can actually trust.
        </h1>

        <LogoMarquee className="mt-10 lg:mt-[2.778vw] w-full max-w-2xl lg:max-w-[46.662vw]" />

        <Link
          href="/get-a-quote"
          className="group mt-12 lg:mt-[3.333vw] inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] border-2 bg-primary px-7 lg:px-[1.944vw] py-2.5 lg:py-[0.694vw] text-base lg:text-[1.111vw]  text-background transition-colors"
        >
          Post a job
          <SVGIcon
            src="/icons/arrow-right.svg"
            className="size-6 lg:size-[1.667vw] text-background transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </section>
  );
}
