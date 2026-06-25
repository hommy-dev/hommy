import posthog from "posthog-js";

// Browser-side analytics helpers. Thin wrappers over the singleton initialized
// in src/components/analytics/posthog-provider.tsx. They guard on `__loaded` so
// they no-op safely when PostHog isn't configured (no key in local dev) instead
// of throwing. Import these from client components only.

/**
 * Capture a client-side event. Returns whether it was actually sent (false when
 * the SDK hasn't initialized) so callers can give feedback if they need to.
 */
export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
): boolean {
  if (!posthog.__loaded) return false;
  posthog.capture(event, properties);
  return true;
}

/**
 * Clear the identified person + reset the distinct id. Call on logout so the
 * next person on a shared browser starts as a fresh anonymous user rather than
 * inheriting the previous user's identity.
 */
export function resetAnalytics(): void {
  if (posthog.__loaded) posthog.reset();
}
