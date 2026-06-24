"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { MediaLightbox, type LightboxSlide } from "@/components/ui/media-lightbox";

// As many thumbnails as comfortably fit one row: 5 on mobile, 8 on desktop.
const MOBILE_MAX = 5;
const DESKTOP_MAX = 8;

/**
 * Compact strip of small work-photo thumbnails for the roofer card (portfolio +
 * Google photos). Fills one row — up to 5 on mobile, 8 on desktop — and the last
 * visible thumbnail shows a "+N" when there are more (count adapts per breakpoint).
 * Tapping any opens the same full-screen lightbox the profile uses.
 */
export function RooferCardWork({
  images,
  alt,
  className,
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const slides: LightboxSlide[] = images.map((u, i) => ({ id: String(i), url: u }));
  const visible = images.slice(0, DESKTOP_MAX);
  const mobileExtra = images.length - MOBILE_MAX;
  const desktopExtra = images.length - DESKTOP_MAX;

  return (
    <div className={cn("flex gap-1.5 lg:gap-[0.4vw]", className)}>
      {visible.map((u, i) => {
        const mobileOverlay = i === MOBILE_MAX - 1 && mobileExtra > 0;
        const desktopOverlay = i === DESKTOP_MAX - 1 && desktopExtra > 0;
        return (
          <button
            key={i}
            type="button"
            onClick={() => setOpen(i)}
            aria-label="View work photos"
            className={cn(
              "group relative size-12 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10 lg:size-[3.2vw] lg:rounded-[0.4vw]",
              // Thumbnails past the mobile cap only appear on desktop.
              i >= MOBILE_MAX && "hidden lg:block",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- remote work photo */}
            <img
              src={u}
              alt={alt}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
            {mobileOverlay && (
              <span className="absolute inset-0 grid place-items-center bg-foreground/55 text-xs font-semibold text-background lg:hidden">
                +{mobileExtra}
              </span>
            )}
            {desktopOverlay && (
              <span className="absolute inset-0 hidden place-items-center bg-foreground/55 text-xs font-semibold text-background lg:grid lg:text-[0.85vw]">
                +{desktopExtra}
              </span>
            )}
          </button>
        );
      })}

      {open !== null && (
        <MediaLightbox
          slides={slides}
          index={open}
          onIndexChange={setOpen}
          onClose={() => setOpen(null)}
          title={alt}
        />
      )}
    </div>
  );
}
