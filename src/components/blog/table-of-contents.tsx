"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { TocHeading } from "./headings";

/** Sticky table of contents with scroll-spy highlighting of the active section. */
export function TableOfContents({ headings }: { headings: TocHeading[] }) {
  const [active, setActive] = useState<string>(headings[0]?.slug ?? "");

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -70% 0px", threshold: 0 },
    );

    for (const { slug } of headings) {
      const el = document.getElementById(slug);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="text-sm">
      <p className="mb-3 font-semibold uppercase tracking-widest text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-2 border-l border-border">
        {headings.map((h) => (
          <li key={h.slug} style={{ paddingLeft: h.level === 3 ? 16 : 0 }}>
            <a
              href={`#${h.slug}`}
              className={cn(
                "-ml-px block border-l-2 pl-4 leading-snug transition-colors",
                active === h.slug
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
