// `contractor/claimed` — a recruited prospect signed up. Auto-connect their Google
// Business listing using the place_id we scraped (contractor_prospects.sourceRef),
// so their profile arrives with real reviews + work photos instead of empty.
//
// Profile prefill (company name, phone, coverage area) happens synchronously at
// provision time; this job is only the slow/billable Google import, kept async so
// it never blocks signup. Idempotent: the connection upserts on
// (contractorId, provider, place_id), so retries/duplicate events are safe.

import { eq } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractorProspects } from '@/lib/db/schema'
import {
  fetchPlaceDetailsContent,
  placeDetailsConfigured,
} from '@/lib/integrations/google-place-details'
import { importGooglePlace } from '@/lib/integrations/google-connect'

export const contractorClaimed = inngest.createFunction(
  {
    id: 'contractor-claimed',
    name: 'Auto-connect a recruited prospect\'s Google listing on signup',
    triggers: [{ event: INNGEST_EVENTS.CONTRACTOR_CLAIMED }],
    retries: 3,
  },
  async ({ event, step }) => {
    const contractorId = event.data.contractorId as string | undefined
    const prospectId = event.data.prospectId as string | undefined
    if (!contractorId || !prospectId) return { ok: false, reason: 'missing ids' }

    if (!placeDetailsConfigured()) return { ok: true, skipped: 'places key not configured' }

    // The scraped Google place_id for this prospect.
    const placeId = await step.run('load-placeid', async () => {
      const [p] = await db
        .select({ sourceRef: contractorProspects.sourceRef })
        .from(contractorProspects)
        .where(eq(contractorProspects.id, prospectId))
        .limit(1)
      return p?.sourceRef ?? null
    })
    if (!placeId) return { ok: true, skipped: 'no place_id on prospect' }

    // Fetch reviews + photos server-side (returns null if unreadable / no billing).
    const fetched = await step.run('fetch-google', () => fetchPlaceDetailsContent(placeId))
    if (!fetched) return { ok: true, skipped: 'no place details' }

    const result = await step.run('import', () =>
      importGooglePlace({
        contractorId,
        selection: fetched.selection,
        content: fetched.content,
        connectedBy: null, // system-initiated, not a user
      }),
    )

    return { ok: true, ...result }
  },
)
