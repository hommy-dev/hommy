"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// `HowItWorks` is below the fold but it's a "use client" island that pulls in
// framer-motion plus six animated scenes and starts a 100ms autoplay timer the
// moment it mounts. Loading all of that during the initial page load is the
// single biggest hit to mobile TBT / main-thread time (Lighthouse mobile).
//
// So we code-split it and only mount it once it's about to scroll into view.
// framer-motion + the scenes then load off the critical path, and the autoplay
// timer never runs while the section is far off-screen. A reserved-height
// placeholder (replaced well before the section is visible, thanks to the
// generous rootMargin) keeps CLS at 0.
const HowItWorks = dynamic(
  () => import("./how-it-works").then((m) => m.HowItWorks),
  { ssr: false },
);

export function HowItWorksLazy() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already past the trigger point on load (e.g. a deep-link to #how-it-works)?
    // Mount immediately.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      // Load ~one viewport early so the real section is in place before the user
      // ever sees the placeholder — no visible shift, no CLS.
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (show) return <HowItWorks />;

  // Reserved space matching the section's rendered height so the page length is
  // stable before the real content swaps in.
  return (
    <div
      ref={ref}
      aria-hidden
      className="min-h-[950px] md:min-h-[760px] lg:min-h-[55vw]"
    />
  );
}
