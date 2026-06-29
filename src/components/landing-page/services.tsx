import Link from "next/link";
import Image from "next/image";
import { Icon } from "../ui/icon";

// Each card shows `rest` by default and crossfades to `hover` on mouse-over.
// For repair/replacement/storm that's a satisfying after→before reveal (we lead
// with the finished result so the grid looks great and mobile, which has no
// hover, still shows the good outcome). Inspection isn't a transformation, so it
// leads with the roofer on the roof and reveals the up-close find.
const SERVICES = [
  {
    title: "Roof repair",
    body: "Leaks, missing shingles, or that spot you keep eyeing. Get it looked at before it turns into a bigger bill.",
    rest: "/services/repair-after.webp",
    hover: "/services/repair-before.webp",
    restLabel: "After",
    hoverLabel: "Before",
  },
  {
    title: "Full replacement",
    body: "Honest numbers from roofers who stand behind both the work and the warranty.",
    rest: "/services/replacement-after.webp",
    hover: "/services/replacement-before.webp",
    restLabel: "After",
    hoverLabel: "Before",
  },
  {
    title: "Storm damage",
    body: "Hail or high wind? Fast inspection, plus help with the insurance side.",
    rest: "/services/storm-after.webp",
    hover: "/services/storm-before.webp",
    restLabel: "After",
    hoverLabel: "Before",
  },
  {
    title: "Roof inspection",
    body: "Buying, selling, or just not sure? Find out exactly what shape your roof is in, no guesswork.",
    rest: "/services/inspection-before.webp",
    hover: "/services/inspection-after.webp",
    restLabel: "On the roof",
    hoverLabel: "Up close",
  },
] satisfies ReadonlyArray<{
  title: string;
  body: string;
  rest: string;
  hover: string;
  restLabel: string;
  hoverLabel: string;
}>;

export function Services() {
  return (
    <section className="scroll-mt-20 lg:scroll-mt-[5.556vw] py-24 lg:py-[6.667vw] bg-background">
      <div className="lg:max-w-[95vw] mx-auto px-5 lg:px-[1.389vw]">
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
                  {/* Resting image — fades out on hover. */}
                  <Image
                    src={s.rest}
                    alt={s.title}
                    fill
                    quality={90}
                    sizes="(min-width: 1024px) 24vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-opacity duration-500 ease-out group-hover:opacity-0"
                  />
                  {/* Hover image — fades in on top (crossfade). */}
                  <Image
                    src={s.hover}
                    alt=""
                    aria-hidden
                    fill
                    quality={90}
                    sizes="(min-width: 1024px) 24vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
                  />
                  {/* State pill — swaps with the image. Toggled via display (not
                      opacity) so the two labels never overlap mid-crossfade. */}
                  <span className="pointer-events-none absolute bottom-2 left-2 lg:bottom-[0.556vw] lg:left-[0.556vw] rounded-full bg-foreground/75 px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-[11px] lg:text-[0.764vw] font-medium text-background backdrop-blur-sm group-hover:hidden">
                    {s.restLabel}
                  </span>
                  <span className="pointer-events-none absolute bottom-2 left-2 lg:bottom-[0.556vw] lg:left-[0.556vw] hidden rounded-full bg-foreground/75 px-2.5 lg:px-[0.694vw] py-0.5 lg:py-[0.139vw] text-[11px] lg:text-[0.764vw] font-medium text-background backdrop-blur-sm group-hover:block">
                    {s.hoverLabel}
                  </span>
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
                className="w-full mt-4 lg:mt-[1vw] inline-flex items-center justify-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] border-2 lg:border-[0.2vw] border-foreground/40 group-hover:border-foreground px-7 lg:px-[1.944vw] py-2.5 lg:py-[0.8vw] text-base lg:text-[1.111vw] font-semibold text-foreground/70 group-hover:text-foreground transition-colors"
              >
                Post a job
                <Icon
                  name="arrow-right"
                  className="size-6 lg:size-[1.3vw] transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
