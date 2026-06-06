// ============================================================
// HOMEI — INNGEST BACKGROUND JOBS
// ============================================================
// Every outbound comm (SMS / email / push) goes through Inngest —
// never call Plivo / Resend / Web Push directly from request handlers.
//
// TODO (next modules, docs/HOMEI_PLATFORM.md §10): lead/engaged charge,
//   quote/accepted award, lead/recipient.sla cascade, review.request,
//   storm.poll (cron), credits.expire (cron).
// ============================================================

import { leadCreated } from './lead-created'

// Registered with serve() in src/app/api/inngest/route.ts
export const functions = [leadCreated]
