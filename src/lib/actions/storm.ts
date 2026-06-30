'use server'

// Admin: log a storm. Inserts a storm_events row and fires STORM_DETECTED, which
// pre-positions roofer supply in the area (discover → enrich → warm invites) and
// makes the shareable /storm/<id> demand landing page live. Founder-triggered for
// now (you see hail hit a suburb → log it); an auto weather-poll can fire the same
// path later.

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getRequiredUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { stormEvents } from '@/lib/db/schema'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'

type Result<T = undefined> = { success: true; data?: T } | { success: false; error: string }

const StormSchema = z.object({
  eventType: z.enum(['hail', 'high_wind', 'storm']),
  severity: z.string().trim().max(60).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional(),
  affectedZipCodes: z.array(z.string().trim().max(12)).max(500).optional().default([]),
})

export async function createStormEvent(input: unknown): Promise<Result<{ id: string }>> {
  await getRequiredUser('admin')
  const parsed = StormSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid storm details.' }
  const d = parsed.data

  const [row] = await db
    .insert(stormEvents)
    .values({
      eventType: d.eventType,
      severity: d.severity || null,
      city: d.city || null,
      state: d.state || null,
      lat: d.lat ?? null,
      lng: d.lng ?? null,
      affectedZipCodes: d.affectedZipCodes,
    })
    .returning({ id: stormEvents.id })

  // Pre-position roofer supply in the storm area (best-effort; never fail the log).
  try {
    await inngest.send({ name: INNGEST_EVENTS.STORM_DETECTED, data: { stormEventId: row.id } })
  } catch (err) {
    console.error('[createStormEvent] inngest send failed', err)
  }

  revalidatePath('/admin/storm-events')
  return { success: true, data: { id: row.id } }
}
