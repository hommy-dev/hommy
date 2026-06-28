'use server'

// Admin actions for the recruitment engine: kick discovery for an uncovered area
// (a city campaign) and push verified prospects to the cold-email tool. Both are
// admin-only and best-effort off the request path.

import { z } from 'zod'
import { getRequiredUser } from '@/lib/auth/session'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { roofingServiceId } from '@/lib/data/locations'
import { exportPendingProspects } from '@/lib/recruitment/outreach-sync'

type Result<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

const CampaignSchema = z.object({
  lat: z.number().finite(),
  lng: z.number().finite(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
})

/** Discover roofing prospects near a point (admin city campaign / "find roofers"). */
export async function startCampaign(input: unknown): Promise<Result> {
  await getRequiredUser('admin')
  const parsed = CampaignSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Pick a valid area.' }

  const serviceId = await roofingServiceId()
  if (!serviceId) return { success: false, error: 'Roofing service not configured.' }

  try {
    await inngest.send({
      name: INNGEST_EVENTS.RECRUITMENT_DISCOVER,
      data: {
        serviceId,
        serviceSlug: 'roofing',
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        city: parsed.data.city ?? null,
        state: parsed.data.state ?? null,
      },
    })
  } catch (err) {
    console.error('[startCampaign] inngest send failed', err)
    return { success: false, error: 'Could not start discovery. Try again.' }
  }
  return { success: true }
}

/** Push the next batch of verified prospects to the cold-email tool. */
export async function runExport(): Promise<Result<{ exported: number; selected: number }>> {
  await getRequiredUser('admin')
  const res = await exportPendingProspects()
  if (!res.ok) return { success: false, error: res.reason ?? 'Export failed.' }
  return { success: true, data: { exported: res.exported, selected: res.selected } }
}
