// Storm detected → pre-position roofer supply. When a storm is logged (admin
// "Log a storm", later an auto weather-poll), we fire contractor discovery for
// the storm's center so there's local supply ready when storm-damage leads land.
// Reuses the recruitment engine (RECRUITMENT_DISCOVER → discover + enrich +
// warm invites). Idempotent via the discoverySent flag.

import { eq } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { stormEvents, services } from '@/lib/db/schema'

export const stormDetected = inngest.createFunction(
  {
    id: 'storm-detected',
    name: 'Storm detected → pre-position roofers',
    triggers: [{ event: INNGEST_EVENTS.STORM_DETECTED }],
    retries: 2,
  },
  async ({ event, step }) => {
    const stormEventId = event.data.stormEventId as string | undefined
    if (!stormEventId) return { ok: false, reason: 'no stormEventId' }

    const storm = await step.run('load-storm', async () => {
      const [s] = await db
        .select({
          lat: stormEvents.lat,
          lng: stormEvents.lng,
          city: stormEvents.city,
          state: stormEvents.state,
          discoverySent: stormEvents.discoverySent,
        })
        .from(stormEvents)
        .where(eq(stormEvents.id, stormEventId))
        .limit(1)
      return s ?? null
    })

    // No precise point → can't run geographic discovery (skip cleanly).
    if (!storm || storm.lat == null || storm.lng == null) {
      return { ok: false, reason: 'storm has no center point' }
    }
    if (storm.discoverySent) return { ok: true, skipped: 'discovery already sent' }

    const serviceId = await step.run('roofing-service', async () => {
      const [svc] = await db
        .select({ id: services.id })
        .from(services)
        .where(eq(services.slug, 'roofing'))
        .limit(1)
      return svc?.id ?? null
    })
    if (!serviceId) return { ok: false, reason: 'roofing service not configured' }

    // Pre-position supply: discover + enrich + warm-invite roofers in the area.
    await step.sendEvent('kick-discovery', [
      {
        name: INNGEST_EVENTS.RECRUITMENT_DISCOVER,
        data: {
          serviceId,
          serviceSlug: 'roofing',
          lat: storm.lat,
          lng: storm.lng,
          city: storm.city,
          state: storm.state,
        },
      },
    ])

    await step.run('mark-sent', () =>
      db.update(stormEvents).set({ discoverySent: true }).where(eq(stormEvents.id, stormEventId)),
    )

    return { ok: true, discoveryKicked: true }
  },
)
