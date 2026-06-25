import Link from "next/link";

import { Icon } from "@/components/ui/icon";

/**
 * Compact "get matched" CTA shown on every blog post — in the right rail on
 * desktop, and below the article on mobile. Dark card with the brand-indigo
 * button so it reads as the page's primary action.
 */
export function BlogCta() {
  return (
    <div className="rounded-lg bg-card border p-5 lg:rounded-[0.556vw] lg:p-[1.4vw]">
      <p className="font-sebenta text-lg font-bold leading-snug lg:text-[1.25vw]">
        Need a roofer you can trust?
      </p>
      <p className="mt-1.5 text-sm lg:mt-[0.4vw] lg:text-[0.85vw]">
        Get free quotes from licensed local pros — no spam calls, no pressure.
      </p>
      <Link
        href="/get-a-quote"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 lg:mt-[1vw] lg:gap-[0.4vw] lg:rounded-[0.4vw] lg:py-[0.7vw] lg:text-[0.9vw]"
      >
        Get my quotes
        <Icon name="arrow-right" className="size-4 lg:size-[1.1vw]" />
      </Link>
    </div>
  );
}
