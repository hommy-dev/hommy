import "server-only";
import { after } from "next/server";
import { PostHog } from "posthog-node";

// Server-side PostHog client for capturing conversion-funnel events from Server
// Actions (lead_posted, lead_engaged, quote_sent, quote_accepted, …) and for
// reading feature flags on the server. Distinct from the browser SDK in
// posthog-provider.tsx — events here are attributed by the user id you pass.
//
// PERFORMANCE: capture never blocks the user. We schedule the network flush with
// next/server's `after()`, which runs *after the response is sent* but keeps the
// serverless function alive long enough to deliver the event. So a Server Action
// returns at full speed and the analytics round-trip happens off the hot path.
//
// Talks straight to PostHog (no /ingest reverse proxy — that's a browser
// ad-blocker concern; server requests aren't blocked). No-ops when no key is set.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let client: PostHog | null = null;

/**
 * Lazily-created singleton. `flushAt: 1` / `flushInterval: 0` mean "send as soon
 * as we ask" — we control timing via `after()` so nothing buffers across the
 * request boundary (where a serverless freeze would drop it).
 */
export function getPostHogServer(): PostHog | null {
  if (!KEY) return null;
  if (!client) {
    client = new PostHog(KEY, { host: HOST, flushAt: 1, flushInterval: 0 });
  }
  return client;
}

/**
 * Capture a server-side event for a known user — fire-and-forget, off the hot
 * path, and never able to break the request. Example:
 *   captureServerEvent(user.id, "quote_accepted", { leadId }, { company: contractorId })
 *
 * `groups` ties the event to a company so PostHog group analytics can build
 * per-company funnels (engage → quote → won) even though those steps are taken
 * by different people — the right model for a two-sided marketplace.
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
  groups?: Record<string, string>,
): void {
  const ph = getPostHogServer();
  if (!ph || !distinctId) return;
  try {
    after(async () => {
      try {
        ph.capture({ distinctId, event, properties, groups });
        await ph.flush();
      } catch {
        // Best-effort: analytics delivery must never affect the user flow.
      }
    });
  } catch {
    // `after()` throws if called outside a request scope (e.g. a CLI script) —
    // safe to skip there; analytics is browser/request-driven.
  }
}
