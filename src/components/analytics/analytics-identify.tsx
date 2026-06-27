"use client";

// Ties the current PostHog person to the authenticated user. Mounted from the
// dashboard layouts (which already resolve the user) the same way
// RealtimeUserEventsMount is — a tiny client component fed server-resolved props.
//
// identify() promotes the anonymous session to a known person and stitches the
// pre-login pageviews to them, so funnels (landing → signup → activated) stay
// connected. Re-identifying with the same id is a cheap no-op.
//
// For contractors we also register a `company` group (with its name), so PostHog
// group analytics shows a readable company instead of a UUID and the user's
// client-side events get attributed to that company too. Matches the `groups:
// { company }` we attach to server-side funnel events (posthog-server.ts).

import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

export function AnalyticsIdentify({
  userId,
  email,
  role,
  company,
}: {
  userId: string;
  email: string;
  role: "contractor" | "homeowner" | "admin";
  /** The contractor's active company — names the PostHog `company` group. */
  company?: { id: string; name: string };
}) {
  const posthog = usePostHog();

  useEffect(() => {
    // Only identify once PostHog is actually initialized — it stays unloaded
    // until the visitor consents to analytics (see posthog-provider.tsx).
    if (!posthog || !posthog.__loaded || !userId) return;
    posthog.identify(userId, { email, role });
    if (company?.id) {
      posthog.group("company", company.id, { name: company.name });
    }
  }, [posthog, userId, email, role, company?.id, company?.name]);

  return null;
}
