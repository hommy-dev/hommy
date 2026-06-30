// Daily honest "founding roofer" invite send. Drains the enriched-prospect queue
// as cold invites within the warmup cap — first touches AND due ~4-day follow-ups
// (sendPendingOutreach handles reputation-first ordering, the 2-email invite cap,
// the cooldown, opt-outs, the invite-stream domain, and the deliverability
// guardrails). Runs after the morning discovery sweep so prospects are enriched.
//
// Gated behind RECRUITMENT_SWEEP_ENABLED (same switch as the sweep) so the whole
// proactive engine turns on/off together via a Vercel env flip.

import { inngest } from '@/lib/inngest/client'
import { sendPendingOutreach } from '@/lib/recruitment/outreach-sync'

export const recruitmentInviteSend = inngest.createFunction(
  {
    id: 'recruitment-invite-send',
    name: 'Daily founder-invite send (warmup-capped)',
    triggers: [{ cron: '0 15 * * *' }], // 15:00 UTC — after the 02:00 discovery sweep enriches
    retries: 1,
  },
  async ({ step }) => {
    if (process.env.RECRUITMENT_SWEEP_ENABLED !== 'true') {
      return { ok: true, skipped: 'sweep disabled' }
    }
    const result = await step.run('send-invites', () => sendPendingOutreach())
    return { ...result }
  },
)
