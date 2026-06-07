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
        className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center text-background"
      >
        <h1 className="font-sebenta text-[2.6rem] font-bold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.25rem]">
          Find a roofer you can actually trust.
        </h1>

        <LogoMarquee className="mt-10 w-full max-w-2xl" />

        <Link
          href="/get-a-quote"
          className="group mt-12 inline-flex items-center gap-2 rounded-lg border-2 bg-primary px-7 py-2.5 text-base font-semibold text-background transition-colors"
        >
          Post a job
          <SVGIcon
            src="/icons/arrow-right.svg"
            className="size-6 text-background transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </section>
  );
}
