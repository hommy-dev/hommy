// ============================================================
// HOMEI — INNGEST BACKGROUND JOBS
// ============================================================
// Every outbound comm (SMS / email / push) goes through Inngest —
// never call Plivo / Resend / Web Push directly from request handlers.
//
// TODO (next modules, docs/HOMEI_PLATFORM.md §10): storm.poll (cron).
// ============================================================

import { leadCreated } from './lead-created'
import { leadEngaged } from './lead-engaged'
import { leadSlaCascade } from './lead-sla-cascade'
import { quoteSubmitted } from './quote-submitted'
import { quoteAccepted } from './quote-accepted'
import { reviewRequest } from './review-request'
import { reviewSubmitted } from './review-submitted'
import { creditsExpire } from './credits-expire'

// Registered with serve() in src/app/api/inngest/route.ts
export const functions = [
  leadCreated,
  leadEngaged,
  leadSlaCascade,
  quoteSubmitted,
  quoteAccepted,
  reviewRequest,
  reviewSubmitted,
  creditsExpire,
]
