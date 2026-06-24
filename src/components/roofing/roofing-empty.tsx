import Link from "next/link";

import { Icon } from "@/components/ui/icon";

/**
 * Clean empty state for the local pages when there's no supply yet. A centered
 * card with a soft icon, a plain-spoken line, and the primary action, so a
 * not-yet-covered area still feels intentional rather than broken.
 */
export function RoofingEmpty({
  message,
  href,
  label = "Post a job for free",
}: {
  message: string;
  href: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-card px-6 py-10 text-center ring-1 ring-foreground/10 lg:rounded-[0.556vw] lg:px-[2vw] lg:py-[2.8vw]">
      <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary lg:size-[3.2vw]">
        <Icon name="search" className="size-6 lg:size-[1.6vw]" />
      </span>
      <p className="mt-4 max-w-md text-muted-foreground lg:mt-[1vw] lg:max-w-[34vw] lg:text-[1.05vw]">
        {message}
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 lg:mt-[1.2vw] lg:gap-[0.4vw] lg:rounded-[0.4vw] lg:px-[1.5vw] lg:py-[0.7vw] lg:text-[1.05vw]"
      >
        {label}
        <Icon name="arrow-right" className="size-4 lg:size-[1.1vw]" />
      </Link>
    </div>
  );
}
