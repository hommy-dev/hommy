"use client";

import { cn } from "@/lib/utils";
import {
  useAuthExperience,
  type Audience,
  type AuthPanelMode,
  type AuthVariant,
} from "./auth-experience";
import { AuthStory } from "./auth-story";

function headlineFor(
  mode: AuthPanelMode,
  variant: AuthVariant,
  audience: Audience,
) {
  if (mode === "welcome") return "Welcome back";
  if (mode === "new-here") return "New here? Here's how it works.";
  if (variant === "contractor" || audience === "contractor") {
    return "Win more work, the modern way.";
  }
  return "Get the right roofer, the easy way.";
}

export function ShowcasePanel() {
  const ctx = useAuthExperience();
  const variant = ctx?.variant ?? "default";
  const mode = ctx?.mode ?? "intro";
  const audience: Audience =
    ctx?.audience ?? (variant === "default" ? "homeowner" : variant);

  const headline = headlineFor(mode, variant, audience);

  return (
    <aside
      aria-hidden
      className={cn(
        "relative hidden overflow-hidden bg-foreground text-background",
        "lg:sticky lg:top-0 lg:flex lg:h-svh lg:w-2/5 lg:shrink-0 lg:flex-col lg:self-start",
      )}
    >
      {/* Brand glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 80% at 100% 0%, color-mix(in oklab, var(--primary) 45%, transparent) 0%, transparent 55%)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-[3vw] p-[3.333vw]">
        <h2 className="max-w-[26vw] text-center font-sebenta text-[2.333vw] font-bold leading-[112%] tracking-normal transition-opacity duration-300">
          {headline}
        </h2>

        <AuthStory audience={audience} />
      </div>
    </aside>
  );
}
