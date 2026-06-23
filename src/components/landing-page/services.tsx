import Link from "next/link";
import Image from "next/image";
import { Icon } from "../ui/icon";

const SERVICES = [
  {
    title: "Roof repair",
    body: "Leaks, missing shingles, or that spot you keep eyeing. Get it looked at before it turns into a bigger bill.",
    src: "/bg/roof-repair.jpg",
  },
  {
    title: "Full replacement",
    body: "Honest numbers from roofers who stand behind both the work and the warranty.",
    src: "/bg/roof-replacement.jpg",
  },
  {
    title: "Storm damage",
    body: "Hail or high wind? Fast inspection, plus help with the insurance side.",
    src: "/bg/storm-damage.jpg",
  },
  {
    title: "Roof inspection",
    body: "Buying, selling, or just not sure? Find out exactly what shape your roof is in, no guesswork.",
    src: "/bg/roof-inspection.jpg",
  },
];

export function Services() {
  return (
    <section className="scroll-mt-20 lg:scroll-mt-[5.556vw] py-24 lg:py-[6.667vw] bg-background">
      <div className="max-w-[90vw] mx-auto px-5 lg:px-[1.389vw]">
        {/* header: copy left, CTA right on desktop */}
        <div className="flex flex-col gap-6 lg:gap-[1.667vw] lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl lg:max-w-[50vw]">
            <h2 className="mt-3 lg:mt-[0.833vw] font-sebenta text-3xl md:text-4xl lg:text-[3.333vw] font-semibold  tracking-tight">
              Whatever your roof needs.
            </h2>
            <p className="mt-4 lg:mt-[1.111vw] lg:max-w-[40vw] font-medium text-base lg:text-[1.2vw] leading-relaxed text-muted-foreground">
              From a quick patch to a full tear-off, we match you with local
              roofers who do exactly this kind of work, day in and day out.
            </p>
          </div>
        </div>

        {/* compact card grid */}
        <div className="mt-12 lg:mt-[3.333vw] grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-[1.3vw] lg:gap-y-[2.222vw]">
          {SERVICES.map((s) => (
            <div key={s.title} className="group flex flex-col justify-between">
              <div>
                <div className="relative aspect-[4/4] w-full overflow-hidden rounded-md lg:rounded-[0.5vw] bg-muted">
                  <Image
                    src={s.src}
                    alt={s.title}
                    fill
                    quality={90}
                    // Images are landscape but the card is portrait (4/5), so
                    // object-cover renders them ~2x wider than the column. The
                    // sizes hint is inflated to match, otherwise the browser
                    // under-fetches and the photo looks soft/upscaled.
                    sizes="(min-width: 1024px) 48vw, 100vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <h3 className="mt-4 lg:mt-[1.111vw] flex items-center gap-1.5 lg:gap-[0.417vw] text-lg lg:text-[1.389vw] font-bold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-1 lg:mt-[0.278vw] text-sm lg:text-[1.042vw] leading-relaxed text-muted-foreground font-medium">
                  {s.body}
                </p>
              </div>
              <Link
                href="/get-a-quote"
                className="w-full mt-4 lg:mt-[1vw] inline-flex items-center justify-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] border-2 lg:border-[0.2vw] border-primary/40 group-hover:border-primary px-7 lg:px-[1.944vw] py-2.5 lg:py-[0.8vw] text-base lg:text-[1.111vw] text-primary transition-colors"
              >
                Post a job
                <Icon
                  name="arrow-right"
                  className="size-6 lg:size-[1.667vw] text-primary transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          ))}
        </div>

        {/* CTA for mobile, where the header button is hidden */}
        <Link
          href="/get-a-quote"
          className="group mt-10 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3 text-base font-semibold text-background sm:w-auto lg:hidden"
        >
          Post a job
          <Icon
            name="arrow-right"
            className="size-6 text-background transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </section>
  );
}
