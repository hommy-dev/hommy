// Daily lead catch-up. A job can land in an uncovered area on a day the lead
// domain's cap is already spent (sendAreaOutreach sends nothing) OR before its
// roofers are enriched, and nothing re-sends it — so the lead sits awaiting
// coverage with reachable roofers never emailed. This re-runs area outreach for
// every still-open awaiting-coverage lead, FIRST-TOUCH ONLY, so every reachable
// roofer near real demand eventually gets exactly one honest email, and no shop
// is daily-spammed about the same stubborn lead. Runs after the morning sweep
// enriches, before the afternoon invites.
//
// Gated behind RECRUITMENT_SWEEP_ENABLED (the proactive-engine master switch).

import { and, eq, gte, isNotNull, sql } from 'drizzle-orm'
import { inngest } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { leads } from '@/lib/db/schema'
import { sendAreaOutreach } from '@/lib/recruitment/outreach-sync'
import { RECRUIT_LEAD_MAX_AGE_DAYS } from '@/lib/config/recruitment'

export const recruitmentLeadCatchup = inngest.createFunction(
  {
    id: 'recruitment-lead-catchup',
    name: 'Daily lead catch-up (first-touch to uncovered-area roofers)',
    triggers: [{ cron: '0 13 * * *' }], // after the 02:00 sweep enriches, before 15:00 invites
    retries: 1,
  },
  async ({ step }) => {
    if (process.env.RECRUITMENT_SWEEP_ENABLED !== 'true') {
      return { ok: true, skipped: 'sweep disabled' }
    }

    // Distinct areas with still-open, still-recent awaiting-coverage demand.
    const areas = await step.run('open-awaiting-areas', async () => {
      const rows = await db
        .select({ serviceId: leads.serviceId, lat: leads.lat, lng: leads.lng })
        .from(leads)
        .where(
          and(
            eq(leads.status, 'open'),
            eq(leads.awaitingCoverage, true),
            isNotNull(leads.lat),
            isNotNull(leads.lng),
            gte(leads.createdAt, sql`now() - make_interval(days => ${RECRUIT_LEAD_MAX_AGE_DAYS})`),
          ),
        )
        .limit(500)
      // Dedupe by service + ~1km-rounded point: many leads share the same roofers.
      const seen = new Set<string>()
      return rows.filter((r) => {
        const key = `${r.serviceId}:${r.lat!.toFixed(2)}:${r.lng!.toFixed(2)}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    })

    if (areas.length === 0) return { ok: true, areas: 0, sent: 0 }

    // sendAreaOutreach checks the lead-domain budget + guardrail on every call and
    // returns 0 once exhausted, so this loop is self-limiting; first-touch-only +
    // the ledger make a retry safe (already-emailed roofers are skipped).
    const result = await step.run('send', async () => {
      let sent = 0
      for (const a of areas) {
        const res = await sendAreaOutreach({
          serviceId: a.serviceId,
          lat: a.lat!,
          lng: a.lng!,
          firstTouchOnly: true,
        })
        sent += res.sent
      }
      return { sent }
    })

    return { ok: true, areas: areas.length, sent: result.sent }
  },
)
