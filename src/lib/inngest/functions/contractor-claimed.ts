// `contractor/claimed` — a recruited prospect signed up. Two jobs:
//   1. AUTO-VERIFY the company if its scraped Google reputation clears the bar
//      (established, well-reviewed local business) — so a recruited roofer can
//      see + quote jobs IMMEDIATELY instead of waiting on manual review (which
//      kills recruited momentum). Their public Google track record is the trust
//      basis. Below the bar (few/no reviews) → stays 'pending' for manual
//      license/insurance review, exactly as before. We never auto-verify a
//      'rejected' company.
//   2. Auto-connect their Google listing using the scraped place_id, so the
//      profile arrives with real reviews + photos instead of empty.
//
// Idempotent: the verify update is guarded to 'pending' rows, and the Google
// connection upserts on (contractorId, provider, place_id).
//
// NOTE: coverage area is set synchronously at provision time, so by the time this
// async job runs the contractor can be matched to leads via CONTRACTOR_ELIGIBLE.

import { and, eq } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractorProspects, contractors } from '@/lib/db/schema'
import {
  fetchPlaceDetailsContent,
  placeDetailsConfigured,
} from '@/lib/integrations/google-place-details'
import { importGooglePlace } from '@/lib/integrations/google-connect'

// Reputation bar for auto-verifying a recruited roofer (tune as trust allows).
const AUTO_VERIFY_MIN_RATING = 4.0
const AUTO_VERIFY_MIN_REVIEWS = 5

export const contractorClaimed = inngest.createFunction(
  {
    id: 'contractor-claimed',
    name: "Auto-verify (by reputation) + connect a recruited prospect's Google listing",
    triggers: [{ event: INNGEST_EVENTS.CONTRACTOR_CLAIMED }],
    retries: 3,
  },
  async ({ event, step }) => {
    const contractorId = event.data.contractorId as string | undefined
    const prospectId = event.data.prospectId as string | undefined
    if (!contractorId || !prospectId) return { ok: false, reason: 'missing ids' }

    // The scraped signals for this prospect (Google rating/reviews + place_id).
    const prospect = await step.run('load-prospect', async () => {
      const [p] = await db
        .select({
          rating: contractorProspects.rating,
          reviewCount: contractorProspects.reviewCount,
          sourceRef: contractorProspects.sourceRef,
        })
        .from(contractorProspects)
        .where(eq(contractorProspects.id, prospectId))
        .limit(1)
      return p ?? null
    })

    // 1) Auto-verify on reputation. Independent of the Google import below (which
    //    can be skipped) — we decide from the rating/reviews we already scraped.
    const autoVerified = await step.run('auto-verify', async () => {
      if (!prospect) return false
      const rating = prospect.rating != null ? Number(prospect.rating) : 0
      const reviews = prospect.reviewCount ?? 0
      if (!Number.isFinite(rating) || rating < AUTO_VERIFY_MIN_RATING || reviews < AUTO_VERIFY_MIN_REVIEWS) {
        return false
      }
      // Only promote a still-pending company (never resurrect a rejected one).
      const res = await db
        .update(contractors)
        .set({ verificationStatus: 'verified' })
        .where(and(eq(contractors.id, contractorId), eq(contractors.verificationStatus, 'pending')))
        .returning({ id: contractors.id })
      return res.length > 0
    })

    // Make them eligible now → they immediately see open jobs in their area
    // (contractor-eligible offers all recent open in-area leads).
    if (autoVerified) {
      await step.sendEvent('mark-eligible', {
        name: INNGEST_EVENTS.CONTRACTOR_ELIGIBLE,
        data: { contractorId },
      })
    }

    // 2) Auto-connect their Google listing (reviews + work photos), if configured.
    if (!placeDetailsConfigured()) return { ok: true, autoVerified, skipped: 'places key not configured' }
    const placeId = prospect?.sourceRef ?? null
    if (!placeId) return { ok: true, autoVerified, skipped: 'no place_id on prospect' }

    const fetched = await step.run('fetch-google', () => fetchPlaceDetailsContent(placeId))
    if (!fetched) return { ok: true, autoVerified, skipped: 'no place details' }

    const result = await step.run('import', () =>
      importGooglePlace({
        contractorId,
        selection: fetched.selection,
        content: fetched.content,
        connectedBy: null, // system-initiated, not a user
      }),
    )

    return { ok: true, autoVerified, ...result }
  },
)
