import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { stormEvents } from '@/lib/db/schema'

export type StormForLanding = {
  id: string
  eventType: string
  severity: string | null
  city: string | null
  state: string | null
  detectedAt: Date
}

/** Public read for the /storm/[id] landing page. */
export async function getStormById(id: string): Promise<StormForLanding | null> {
  const [s] = await db
    .select({
      id: stormEvents.id,
      eventType: stormEvents.eventType,
      severity: stormEvents.severity,
      city: stormEvents.city,
      state: stormEvents.state,
      detectedAt: stormEvents.detectedAt,
    })
    .from(stormEvents)
    .where(eq(stormEvents.id, id))
    .limit(1)
  return s ?? null
}
