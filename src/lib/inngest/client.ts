// Documentation: https://www.inngest.com/docs

import { Inngest } from "inngest"

export const inngest = new Inngest({ id: "hommy" })

// ============================================================
// EVENT TYPES (Phase 1 - no subscription events)
// ============================================================

export const INNGEST_EVENTS = {
  // Project events
  PROJECT_MATCHING_REQUESTED: "project/matching.requested",
  PROJECT_MATCHING_RETRY: "project/matching.retry",
  PROJECT_EXPIRY_SCHEDULED: "project/expiry.scheduled",

  // Lead events (v2 — credit economy, see docs/HOMMY_PLATFORM.md §10)
  LEAD_CREATED: "lead/created",            // fan-out done inline; this drives async comms
  DIRECT_REQUEST_CREATED: "lead/direct-request.created", // direct hire — notify the one chosen company
  LEAD_ENGAGED: "lead/engaged",            // contractor engaged — charge + project (future module)
  LEAD_RECIPIENT_SLA: "lead/recipient.sla", // offer passed SLA — cascade (future module)
  LEAD_EXPIRY_SCHEDULED: "lead/expiry.scheduled",
  LEAD_DECLINE_PROCESSED: "lead/decline.processed",

  // Quote events
  QUOTE_SUBMITTED: "quote/submitted",
  QUOTE_EXPIRY_SCHEDULED: "quote/expiry.scheduled",
  QUOTE_ACCEPTED: "quote/accepted",

  // Job events
  JOB_CREATED: "job/created",

  // Payment events
  PAYMENT_AUTO_RELEASE_SCHEDULED: "payment/auto-release.scheduled",
  PAYMENT_AUTO_RELEASE_CANCELLED: "payment/auto-release.cancelled",
  PAYMENT_RELEASE_WARNING_T24: "payment/release-warning.t24",
  PAYMENT_RELEASE_WARNING_T48: "payment/release-warning.t48",
  PAYMENT_RELEASE_WARNING_T66: "payment/release-warning.t66",

  // Review events
  REVIEW_REQUEST_SCHEDULED: "review/request.scheduled",
  REVIEW_SUBMITTED: "review/submitted",

  // REMOVED: Subscription events (Phase 1 - no subscription)
  // SUBSCRIPTION_BILLING_CYCLE: "subscription/billing-cycle",
  // SUBSCRIPTION_PAYMENT_FAILED: "subscription/payment.failed",
  // SUBSCRIPTION_PAYMENT_SUCCEEDED: "subscription/payment.succeeded",

  // Contractor events
  CONTRACTOR_FIRST_LEAD_SCHEDULED: "contractor/first-lead.scheduled",
  CONTRACTOR_WELCOME: "contractor/welcome.requested", // first confirmed session — send the welcome (credits + how it works)

  // Notification events
  NOTIFICATION_LEAD_EXPIRY_WARNING: "notification/lead-expiry-warning",

  // Site-visit fee events (Phase 1)
  SITE_VISIT_REQUESTED: "site-visit/requested",
  SITE_VISIT_SCHEDULED: "site-visit/scheduled",

  // Quote acceptance — cooling-off window (Phase 2)
  QUOTE_COOLING_OFF_SCHEDULED: "quote/cooling-off.scheduled",

  // Post-job lifecycle (Phase 3) — fired when a job's payment is RELEASED.
  JOB_LIFECYCLE_SCHEDULED: "job/lifecycle.scheduled",

  // AI sentiment scan on chat (Phase 4). Debounced per conversation.
  CHAT_SENTIMENT_REQUESTED: "chat/sentiment.requested",
} as const;

// ============================================================
// TYPE HELPERS
// ============================================================

export type InngestEvent<T extends keyof typeof INNGEST_EVENTS> = {
  name: (typeof INNGEST_EVENTS)[T];
  data: Record<string, unknown>;
};
