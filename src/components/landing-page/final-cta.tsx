import Link from "next/link";
import { Icon } from "../ui/icon";

/**
 * Closing call-to-action. Defaults to the homepage copy, but the roofing /
 * roofer pages pass their own title/body/href so the same on-brand panel is
 * reused everywhere instead of a one-off CTA per page.
 */
export function FinalCta({
  title = "Let's get your roof sorted.",
  body = "A few vetted local roofers, matched to your job. Free to post, no pressure.",
  label = "Post a job",
  href = "/get-a-quote",
}: {
  title?: string;
  body?: string;
  label?: string;
  href?: string;
}) {
  return (
    <section className="px-4 lg:px-[1.111vw] pt-24 lg:pt-[8.889vw] pb-4 lg:pb-[6vw] sm:px-5 bg-background">
      <div className="bg-[url('/bg/cta.jpg')] bg-cover relative lg:max-w-[80vw] mx-auto overflow-hidden rounded-md lg:rounded-[0.8vw] px-6 lg:px-[1.667vw] py-20 text-center text-foreground lg:py-[7vw]">
        <h2 className="mx-auto max-w-2xl lg:max-w-[50vw] text-balance font-sebenta text-4xl font-bold leading-[1.05] tracking-tight sm:text-2xl lg:text-[3vw]">
          {title}
        </h2>
        <p className="mx-auto mt-5 lg:mt-[1.389vw] max-w-md lg:max-w-[31.108vw] text-[17px] lg:text-[1.3vw] font-semibold leading-relaxed text-foreground">
          {body}
        </p>
        <Link
          href={href}
          className="group mt-12 lg:mt-[3.333vw] inline-flex items-center gap-2 lg:gap-[0.556vw] rounded-lg lg:rounded-[0.694vw] border-2 bg-foreground px-7 lg:px-[1.944vw] py-2.5 lg:py-[0.694vw] text-base lg:text-[1.111vw]  text-background transition-colors"
        >
          {label}
          <Icon
            name="arrow-right"
            className="size-6 lg:size-[1.667vw] text-background transition-transform group-hover:translate-x-0.5"
          />
        </Link>

        {/* Oversized wordmark anchored to the bottom edge */}
        {/* <p
          aria-hidden
          className="pointer-events-none mt-12 lg:mt-[3.333vw] select-none font-sebenta text-[24vw] font-bold leading-[0.72] tracking-tighter text-secondary-foreground/10 lg:text-[16vw]"
        >
          Hommy
        </p> */}
      </div>
    </section>
  );
}
