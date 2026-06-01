// ============================================================
// HOMEI — INNGEST BACKGROUND JOBS
// ============================================================
// TODO: Implement automations per docs/HOMEI_PLATFORM.md §9:
//   lead.assigned, lead.expiring, lead.expired, project.stage_changed,
//   followup.due, review.request, storm.monitor (cron),
//   leads.monthly_reset (cron).
//
// Every outbound comm (SMS / email / push) goes through Inngest —
// never call Twilio / Resend / Web Push directly from request handlers.
// ============================================================

// Registered with serve() in src/app/api/inngest/route.ts
export const functions: never[] = []
