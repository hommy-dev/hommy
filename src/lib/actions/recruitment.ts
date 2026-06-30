'use server'

// Admin actions for the recruitment engine: kick discovery for an uncovered area
// (a city campaign) and push verified prospects to the cold-email tool. Both are
// admin-only and best-effort off the request path.

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getRequiredUser } from '@/lib/auth/session'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractorProspects, prospectEnrichmentJobs } from '@/lib/db/schema'
import { roofingServiceId } from '@/lib/data/locations'
import { sendPendingOutreach } from '@/lib/recruitment/outreach-sync'
import { getProspectDetail, type ProspectDetail } from '@/lib/data/admin-recruitment'

const IdSchema = z.object({ id: z.string().uuid() })

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

/** Send the next batch of recruitment emails to verified prospects (via Resend). */
export async function runOutreach(): Promise<Result<{ sent: number; selected: number }>> {
  await getRequiredUser('admin')
  const res = await sendPendingOutreach()
  if (!res.ok) return { success: false, error: res.reason ?? 'Sending failed.' }
  return { success: true, data: { sent: res.sent, selected: res.selected } }
}

/** Stop emailing one prospect (manual suppression from the admin detail view). */
export async function suppressProspect(input: unknown): Promise<Result> {
  await getRequiredUser('admin')
  const parsed = IdSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid prospect.' }

  await db
    .update(contractorProspects)
    .set({ outreachStatus: 'suppressed', updatedAt: new Date() })
    .where(eq(contractorProspects.id, parsed.data.id))
  revalidatePath('/admin/recruitment')
  return { success: true }
}

/** Re-run email enrichment for one prospect (reset status + re-queue the job). */
export async function requeueProspectEnrichment(input: unknown): Promise<Result> {
  await getRequiredUser('admin')
  const parsed = IdSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid prospect.' }
  const id = parsed.data.id

  await db
    .update(contractorProspects)
    .set({ enrichmentStatus: 'discovered', updatedAt: new Date() })
    .where(eq(contractorProspects.id, id))

  // Reset (or create) the job row so the worker re-claims it.
  await db
    .insert(prospectEnrichmentJobs)
    .values({ prospectId: id, status: 'queued' })
    .onConflictDoUpdate({
      target: prospectEnrichmentJobs.prospectId,
      set: { status: 'queued', attempts: 0, lastError: null, claimedAt: null, lockedBy: null, updatedAt: new Date() },
    })

  try {
    await inngest.send({ name: INNGEST_EVENTS.PROSPECT_ENRICH, data: { prospectId: id } })
  } catch (err) {
    console.error('[requeueProspectEnrichment] inngest send failed', err)
    // Job row is queued; the drain cron will pick it up even if this send failed.
  }
  revalidatePath('/admin/recruitment')
  return { success: true }
}

/** Load a prospect's full detail for the admin detail sheet. */
export async function getProspectDetailAction(id: string): Promise<ProspectDetail | null> {
  await getRequiredUser('admin')
  return getProspectDetail(id)
}
