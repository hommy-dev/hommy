import Link from "next/link";

import { Icon } from "@/components/ui/icon";

/**
 * The page hero for the roofing / roofer pages: a brand-gradient card that holds
 * the SEO H1 + a short value line and leads with the primary "post a job" action
 * (the fast, safe, recommended path), while the roofer directory below is for
 * those who'd rather browse and reach out directly.
 */
export function RoofingHero({
  title,
  intro,
  ctaHref,
  ctaLabel = "Get free quotes",
  demand,
}: {
  title: string;
  intro: string;
  ctaHref: string;
  ctaLabel?: string;
  /** e.g. "3 homeowners asked for quotes here recently". */
  demand?: string | null;
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-gradient-to-br from-[#1f00ce] to-[#5b34ff] p-6 text-background sm:p-8 lg:rounded-[1.111vw] lg:p-[2.5vw]">
      <h1 className="max-w-3xl font-sebenta text-3xl font-semibold leading-[1.08] tracking-tight text-background sm:text-4xl lg:max-w-[58vw] lg:text-[3vw]">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-background/85 sm:text-lg lg:mt-[0.8vw] lg:max-w-[46vw] lg:text-[1.15vw]">
        {intro}
      </p>
      <p className="mt-3 max-w-2xl text-sm text-background/70 lg:mt-[0.7vw] lg:max-w-[46vw] lg:text-[0.92vw]">
        The fast, safe way: post your job and a few vetted local roofers reach out, and you choose who you
        talk to. Or browse roofers below and reach out yourself.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 lg:mt-[1.6vw] lg:gap-x-[1.4vw]">
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 rounded-md bg-background px-6 py-3 font-semibold text-foreground transition-transform hover:-translate-y-0.5 lg:gap-[0.4vw] lg:rounded-[0.4vw] lg:px-[1.667vw] lg:py-[0.8vw] lg:text-[1.05vw]"
        >
          {ctaLabel}
          <Icon name="arrow-right" className="size-5 lg:size-[1.2vw]" />
        </Link>
        {demand ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-background/85 lg:gap-[0.4vw] lg:text-[0.92vw]">
            <Icon name="time-circle" className="size-4 lg:size-[1.1vw]" />
            {demand}
          </span>
        ) : null}
      </div>
    </section>
  );
}
