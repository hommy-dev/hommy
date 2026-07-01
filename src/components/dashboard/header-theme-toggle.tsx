"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Icon } from "@/components/ui/icon";

const ICON_BTN =
  "flex size-9 lg:size-[2.5vw] items-center justify-center rounded-full text-foreground/65 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// next-themes resolves the theme only on the client, so the toggle renders
// different markup on server vs. client. Gate it behind a mount flag so the
// first client render matches the SSR placeholder (no hydration mismatch).
export function HeaderThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time post-hydration mount flag (next-themes is client-only)
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="size-9 lg:size-[2.5vw] shrink-0" aria-hidden />;
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={ICON_BTN}
    >
      <Icon name={isDark ? "moon" : "sun"} className="size-[18px] lg:size-[1.25vw]" />
    </button>
  );
}
