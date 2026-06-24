import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import type { ProCard } from "@/lib/data/locations";
import { RooferCardWork } from "./roofer-card-work";

const subtypeText = (s: string) => (s === "Storm Damage" ? "Storm damage" : s);

/**
 * Verified-roofer tile (vertical): identity + rating + service chips, a compact
 * row of small work-photo thumbnails (opens the lightbox), and two equal actions.
 * Sized to read well in the 2-col grid beside the directory sidebar.
 */
export function RooferCard({ pro, quoteHref }: { pro: ProCard; quoteHref: string }) {
  const profileHref = pro.slug ? `/roofers/${pro.slug}` : null;
  const name = pro.companyName ?? "Verified roofer";
  const hasRating = pro.avgRating != null && pro.totalReviews > 0;
  const subtypes = pro.subtypes ?? [];
  const shown = subtypes.slice(0, 3);
  const extra = subtypes.length - shown.length;
  const images = pro.images ?? [];

  return (
    <article className="flex flex-col rounded-lg bg-card p-5 ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/25 lg:rounded-[0.556vw] lg:p-[1.389vw]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-3 lg:gap-[0.833vw]">
          {pro.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary contractor logo URL
            <img
              src={pro.logoUrl}
              alt={name}
              className="size-12 shrink-0 rounded-md object-cover ring-1 ring-foreground/10 lg:size-[3.333vw]"
            />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground ring-1 ring-foreground/10 lg:size-[3.333vw]">
              <Icon name="home" className="size-5 lg:size-[1.6vw]" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 lg:gap-[0.4vw]">
              {profileHref ? (
                <Link
                  href={profileHref}
                  className="truncate font-semibold text-foreground transition-colors hover:text-primary lg:text-[1.111vw]"
                >
                  {name}
                </Link>
              ) : (
                <span className="truncate font-semibold text-foreground lg:text-[1.111vw]">{name}</span>
              )}
              <Icon name="badge-check" className="size-4 shrink-0 text-primary lg:size-[1.1vw]" />
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground lg:mt-[0.3vw] lg:gap-x-[0.6vw] lg:text-[0.903vw]">
              {hasRating ? (
                <span className="inline-flex items-center gap-1 lg:gap-[0.3vw]">
                  <Icon name="star-filled" className="size-3.5 text-warning lg:size-[0.95vw]" />
                  <span className="font-semibold text-foreground">{pro.avgRating!.toFixed(1)}</span>
                  <span>({pro.totalReviews})</span>
                </span>
              ) : (
                <span>Newly verified</span>
              )}
              {pro.yearsInBusiness ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{pro.yearsInBusiness} yrs</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {shown.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 lg:mt-[0.833vw] lg:gap-[0.4vw]">
            {shown.map((s) => (
              <span
                key={s}
                className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-foreground/70 lg:px-[0.5vw] lg:text-[0.78vw]"
              >
                {subtypeText(s)}
              </span>
            ))}
            {extra > 0 && (
              <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-foreground/70 lg:px-[0.5vw] lg:text-[0.78vw]">
                +{extra}
              </span>
            )}
          </div>
        )}

        {/* Work photos — a compact thumbnail strip */}
        {images.length > 0 && (
          <RooferCardWork images={images} alt={name} className="mt-3 lg:mt-[0.833vw]" />
        )}

        <div className="mt-auto flex gap-2 pt-4 lg:gap-[0.556vw] lg:pt-[1.111vw]">
          <Link
            href={quoteHref}
            className="flex-1 inline-flex items-center justify-center rounded-md bg-card px-4 py-2.5 text-sm font-semibold text-foreground ring-1 ring-foreground/15 transition-colors hover:ring-foreground/30 lg:rounded-[0.4vw] lg:py-[0.6vw] lg:text-[0.9vw]"
          >
            Get a quote
          </Link>
          {profileHref && (
            <Link
              href={profileHref}
              className="flex-1 inline-flex items-center justify-center rounded-md bg-card px-4 py-2.5 text-sm font-semibold text-foreground ring-1 ring-foreground/15 transition-colors hover:ring-foreground/30 lg:rounded-[0.4vw] lg:py-[0.6vw] lg:text-[0.9vw]"
            >
              View profile
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
