"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

// Brand glyphs as inline SVG (currentColor) — we don't pull in an icon library
// for these, and they aren't part of the custom /public/icons set.
const ICONS = {
  instagram:
    "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  link: "M3.9 12a3.1 3.1 0 013.1-3.1h4V7H7a5 5 0 100 10h4v-1.9H7A3.1 3.1 0 013.9 12zM8 13h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 010 6.2h-4V17h4a5 5 0 100-10z",
  check: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
} as const;

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-4 lg:size-[1.1vw]">
      <path d={d} />
    </svg>
  );
}

/**
 * Article share controls — Instagram / X / Facebook + copy link. Rendered as a
 * sticky vertical rail beside the article on desktop, and inline (horizontal)
 * below the article on mobile.
 */
export function ShareRail({
  direction = "vertical",
  className,
}: {
  direction?: "vertical" | "horizontal";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const open = (url: string) => {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) w.opener = null;
  };
  const share = (kind: "instagram" | "x" | "facebook") => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    // Instagram has no web share-intent URL, so open Instagram directly.
    if (kind === "instagram") open("https://www.instagram.com/");
    else if (kind === "x") open(`https://x.com/intent/tweet?url=${url}&text=${title}`);
    else open(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const btn =
    "grid size-10 lg:size-[2.6vw] place-items-center rounded-full text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-foreground hover:text-background";

  return (
    <div
      className={cn(
        "flex items-center gap-3 lg:gap-[0.8vw]",
        direction === "vertical" ? "flex-col" : "flex-row flex-wrap",
        className,
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:text-[0.764vw]">
        Share
      </span>
      <button className={btn} onClick={() => share("instagram")} aria-label="Share on Instagram">
        <Glyph d={ICONS.instagram} />
      </button>
      <button className={btn} onClick={() => share("x")} aria-label="Share on X">
        <Glyph d={ICONS.x} />
      </button>
      <button className={btn} onClick={() => share("facebook")} aria-label="Share on Facebook">
        <Glyph d={ICONS.facebook} />
      </button>
      <button className={btn} onClick={copy} aria-label="Copy link">
        <Glyph d={copied ? ICONS.check : ICONS.link} />
      </button>
    </div>
  );
}
