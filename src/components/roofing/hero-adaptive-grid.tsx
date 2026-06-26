"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { ProCard } from "@/lib/data/locations";
import { RooferCard } from "./roofer-card";
import { RooferCardHero } from "./roofer-card-hero";

// Two compact columns only when the cards area is genuinely this wide — matches
// the @4xl container breakpoint used by the plain directory grid.
const TWO_COL_MIN = 896;

// Measure before paint on the client; no-op (useEffect) on the server so SSR
// doesn't warn about useLayoutEffect.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Mode = "grid2" | "grid1" | "hero";

/**
 * The homeowner directory's adaptive card grid. It reacts to the ACTUAL width of
 * the cards area (which shrinks when the dashboard sidebar opens), not the raw
 * viewport:
 *   • wide enough  → two compact columns      (sidebar collapsed)
 *   • narrow + desktop → one wide "hero" card (sidebar expanded)
 *   • narrow + mobile  → one compact column
 * The transition is a quick crossfade (synced to the sidebar's slide), so the
 * layout changes smoothly rather than snapping. Respects reduced-motion.
 */
export function HeroAdaptiveGrid({
  items,
  quoteHref,
}: {
  items: ProCard[];
  quoteHref: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("grid2");
  const [shown, setShown] = useState<Mode>("grid2");
  const controls = useAnimationControls();

  // Measure before paint so the first frame is already correct (no flash), and
  // keep it in sync as the cards area resizes or the viewport crosses lg.
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const compute = () => {
      const w = el.clientWidth;
      const next: Mode = w >= TWO_COL_MIN ? "grid2" : mq.matches ? "hero" : "grid1";
      if (!didInit.current) {
        // First settle: adopt the real mode without animating.
        didInit.current = true;
        setMode(next);
        setShown(next);
      } else {
        setMode(next);
      }
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    mq.addEventListener("change", compute);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", compute);
    };
  }, []);

  // Crossfade the whole grid when the mode changes: dip out, swap layout while
  // invisible, fade back in. Robust (just opacity on the container) and reads as
  // a smooth transition alongside the sidebar's own 200ms width animation. Under
  // reduced-motion we skip the fade and render `mode` directly (see `active`).
  useEffect(() => {
    if (reduce || mode === shown) return;
    let cancelled = false;
    controls
      .start({ opacity: 0, transition: { duration: 0.12, ease: "easeOut" } })
      .then(() => {
        if (cancelled) return;
        setShown(mode); // async (in a promise callback), after the dip-out
        return controls.start({ opacity: 1, transition: { duration: 0.18, ease: "easeOut" } });
      });
    return () => {
      cancelled = true;
    };
  }, [mode, shown, reduce, controls]);

  const active = reduce ? mode : shown;
  const cols = active === "grid2" ? "grid-cols-2" : "grid-cols-1";
  const isHero = active === "hero";

  return (
    <motion.div
      ref={ref}
      animate={controls}
      className={cn("grid gap-4 lg:gap-[1.111vw]", cols)}
    >
      {items.map((p) =>
        isHero ? (
          <RooferCardHero key={p.id} pro={p} quoteHref={quoteHref} />
        ) : (
          <RooferCard key={p.id} pro={p} quoteHref={quoteHref} />
        ),
      )}
    </motion.div>
  );
}
