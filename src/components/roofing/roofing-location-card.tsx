import Link from "next/link";

import { Icon } from "@/components/ui/icon";

/**
 * Location tile for the "browse by area" lists (states on the hub, cities on a
 * state page). A location-pin icon, the place name, and a real supply count.
 * Only render these for places that actually have inventory — never a
 * "coming soon" placeholder.
 */
export function RoofingLocationCard({
  href,
  name,
  count,
}: {
  href: string;
  name: string;
  count: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/25 lg:gap-[0.833vw] lg:rounded-[0.556vw] lg:p-[1.111vw]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary lg:size-[2.8vw] lg:rounded-[0.4vw]">
        <Icon name="location" className="size-5 lg:size-[1.4vw]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sebenta text-lg font-semibold text-foreground lg:text-[1.25vw]">
          {name}
        </span>
        <span className="block text-sm text-muted-foreground lg:text-[0.85vw]">{count}</span>
      </span>
      <Icon
        name="arrow-right"
        className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 lg:size-[1.1vw]"
      />
    </Link>
  );
}
