"use client";

// Client-side PostHog provider. Mounted once near the root (src/app/layout.tsx)
// so every page has access to the SDK + autocaptured pageviews.
//
// Ingestion is reverse-proxied through our own origin at /ingest (rewrites in
// next.config.ts) so ad-blockers — which block *.posthog.com directly — don't
// silently drop our analytics. `ui_host` still points at the real app so the
// PostHog toolbar/links resolve correctly.
//
// No-ops cleanly when NEXT_PUBLIC_POSTHOG_KEY is unset (local dev without a key):
// children render normally, just without analytics.

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useConsent } from "@/components/consent/consent-context";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
// Ingestion host — only used to derive the app (ui) host below; the browser
// talks to /ingest, never this directly.
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
// us.i.posthog.com -> us.posthog.com (the app where you view dashboards).
const UI_HOST = HOST.replace(".i.posthog.com", ".posthog.com");

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // GDPR-grade: PostHog does not load (no cookies, no capture) until the visitor
  // accepts analytics. If they later turn it off, stop capturing.
  const { prefs } = useConsent();
  const analyticsAllowed = prefs?.analytics === true;

  useEffect(() => {
    if (!KEY) return;
    if (analyticsAllowed) {
      if (!posthog.__loaded) {
        posthog.init(KEY, {
          api_host: "/ingest",
          ui_host: UI_HOST,
          // Modern PostHog defaults: history-based pageview + pageleave autocapture,
          // sensible privacy + performance settings. Pin the date so behaviour is
          // stable across SDK upgrades.
          defaults: "2025-05-24",
          // Only create person profiles for users we identify() — keeps anonymous
          // marketing traffic from inflating tracked-user counts/cost.
          person_profiles: "identified_only",
        });
      } else {
        posthog.opt_in_capturing();
      }
    } else if (posthog.__loaded) {
      // Consent withdrawn this session — stop capturing immediately.
      posthog.opt_out_capturing();
    }
  }, [analyticsAllowed]);

  if (!KEY) return <>{children}</>;
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
