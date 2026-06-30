// Daily proactive roofer discovery sweep. The supply side of the marketing
// engine: every morning we pick the highest-demand / highest-population areas in
// our operating states that AREN'T covered yet (and weren't swept recently), and
// kick contractor discovery + email enrichment there. NO emails are sent here —
// discovery only fires RECRUITMENT_DISCOVER, which discovers + enriches but does
// NOT send (only the lead path sends). The honest invites go out separately via
// recruitment-invite-send once prospects are enriched.
//
// Gated behind RECRUITMENT_SWEEP_ENABLED so go-live is a Vercel env flip. Rotation
// (cities.last_recruited_at + ROTATE_DAYS) stops us re-scraping the same area and
// burning Places quota; coverage skip stops us recruiting where we're already set.

import { eq } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { cities } from '@/lib/db/schema'
import { roofingServiceId } from '@/lib/data/locations'
import { getRecruitmentSweepTargets } from '@/lib/data/admin-recruitment'
import { SWEEP_AREAS_PER_DAY } from '@/lib/config/recruitment'

export const recruitmentSweep = inngest.createFunction(
  {
    id: 'recruitment-sweep',
    name: 'Daily proactive roofer discovery sweep',
    triggers: [{ cron: '0 2 * * *' }], // 02:00 UTC — discovery in the morning, invites at 15:00
    retries: 1,
  },
  async ({ step }) => {
    if (process.env.RECRUITMENT_SWEEP_ENABLED !== 'true') {
      return { ok: true, skipped: 'sweep disabled' }
    }

    const serviceId = await step.run('roofing-service', () => roofingServiceId())
    if (!serviceId) return { ok: false, reason: 'roofing service not configured' }

    const targets = await step.run('pick-areas', () => getRecruitmentSweepTargets(SWEEP_AREAS_PER_DAY))
    if (targets.length === 0) return { ok: true, swept: 0, reason: 'no uncovered areas due' }

    // Discover + enrich each area (RECRUITMENT_DISCOVER does NOT send — sending is
    // the invite cron's job, with honest copy).
    await step.sendEvent(
      'discover-areas',
      targets.map((t) => ({
        name: INNGEST_EVENTS.RECRUITMENT_DISCOVER,
        data: {
          serviceId,
          serviceSlug: 'roofing',
          lat: t.lat,
          lng: t.lng,
          city: t.city,
          state: t.state,
        },
      })),
    )

    // Stamp so we rotate to other areas before revisiting these.
    await step.run('mark-swept', async () => {
      for (const t of targets) {
        await db.update(cities).set({ lastRecruitedAt: new Date() }).where(eq(cities.id, t.cityId))
      }
    })

    return { ok: true, swept: targets.length, areas: targets.map((t) => `${t.city}, ${t.state}`) }
  },
)
