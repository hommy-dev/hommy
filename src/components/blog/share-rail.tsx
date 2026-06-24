"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

// Brand glyphs as inline SVG (currentColor) — we don't pull in an icon library
// for these, and they aren't part of the custom /public/icons set.
const ICONS = {
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
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
 * Article share controls — LinkedIn / X / Facebook + copy link. Rendered as a
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
  const share = (kind: "linkedin" | "x" | "facebook") => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    if (kind === "linkedin")
      open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
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
      <button className={btn} onClick={() => share("linkedin")} aria-label="Share on LinkedIn">
        <Glyph d={ICONS.linkedin} />
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
