"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { MediaLightbox, type LightboxSlide } from "@/components/ui/media-lightbox";
import type { ProCard } from "@/lib/data/locations";

const subtypeText = (s: string) => (s === "Storm Damage" ? "Storm damage" : s);

// Both actions share the same outline style (no filled "primary" button).
const BTN_CLS =
  "flex-1 inline-flex items-center justify-center rounded-md bg-card px-4 py-2.5 text-sm font-semibold text-foreground ring-1 ring-foreground/15 transition-colors hover:ring-foreground/30 lg:rounded-[0.4vw] lg:py-[0.6vw] lg:text-[0.9vw]";

function Photo({
  src,
  onClick,
  className,
  children,
}: {
  src: string;
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("group relative overflow-hidden bg-muted", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary contractor work-photo URL */}
      <img
        src={src}
        alt=""
        loading="lazy"
        className="size-full object-cover transition-transform group-hover:scale-105"
      />
      {children}
    </button>
  );
}

/**
 * Wide "hero" roofer card for the 1-column homeowner directory (variants B + D
 * combined): info + actions on the left, work photos on the right. The right
 * panel is a 2×2 grid when the company has 4+ photos (variant B), otherwise a
 * single image with a gradient overlay (variant D). Falls back to info-only when
 * there are no photos. Quote button starts a DIRECT request (?for=slug).
 */
export function RooferCardHero({ pro, quoteHref }: { pro: ProCard; quoteHref: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const profileHref = pro.slug ? `/roofers/${pro.slug}` : null;
  const quoteTargetHref = pro.slug
    ? `${quoteHref}${quoteHref.includes("?") ? "&" : "?"}for=${pro.slug}`
    : quoteHref;
  const name = pro.companyName ?? "Verified roofer";
  const hasRating = pro.avgRating != null && pro.totalReviews > 0;
  const subtypes = pro.subtypes ?? [];
  const shown = subtypes.slice(0, 3);
  const extraChips = subtypes.length - shown.length;
  const images = pro.images ?? [];
  const shownImages = images.slice(0, 2); // a single row of at most two photos
  const extra = images.length - shownImages.length; // >0 → "+N" on the last one
  const slides: LightboxSlide[] = images.map((u, i) => ({ id: String(i), url: u }));

  return (
    <article className="flex overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10 lg:rounded-[0.556vw]">
      {/* Left — identity + actions */}
      <div className="flex min-w-0 flex-1 flex-col p-5 lg:p-[1.389vw]">
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
            {extraChips > 0 && (
              <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-foreground/70 lg:px-[0.5vw] lg:text-[0.78vw]">
                +{extraChips}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-4 lg:gap-[0.556vw] lg:pt-[1.111vw]">
          <Link href={quoteTargetHref} className={BTN_CLS}>
            Get a quote
          </Link>
          {profileHref && (
            <Link href={profileHref} className={BTN_CLS}>
              View profile
            </Link>
          )}
        </div>
      </div>

      {/* Right — up to two work photos in a SINGLE row (a 2×2 grid made the card
          too tall). One photo fills the panel; two split it; 3+ shows "+N" on the
          second. Clicking any opens the full lightbox. */}
      {shownImages.length > 0 && (
        <div className="flex w-[42%] shrink-0 gap-0.5">
          {shownImages.map((u, i) => (
            <Photo key={i} src={u} onClick={() => setOpen(i)} className="min-w-0 flex-1">
              {i === shownImages.length - 1 && extra > 0 && (
                <span className="absolute inset-0 grid place-items-center bg-foreground/55 text-base font-semibold text-background lg:text-[1.111vw]">
                  +{extra}
                </span>
              )}
            </Photo>
          ))}
        </div>
      )}

      {open !== null && (
        <MediaLightbox
          slides={slides}
          index={open}
          onIndexChange={setOpen}
          onClose={() => setOpen(null)}
          title={name}
        />
      )}
    </article>
  );
}
