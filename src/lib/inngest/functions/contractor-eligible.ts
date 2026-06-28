// `contractor/eligible` — a contractor just became able to serve new areas
// (verified by an admin, or a verified company added/expanded a coverage area).
// Re-checks the awaiting-coverage backlog: any open lead this contractor now
// covers gets offered to them and un-flagged, and the homeowner is told a roofer
// is finally available. This is the payoff half of the recruitment engine — the
// homeowner posted once into an empty area and gets matched the moment supply
// arrives.
//
// Idempotent: lead_recipients has a unique (lead, contractor) index so the insert
// is a no-op on replay, and the homeowner notification carries a dedupKey.
//
// NOTE: serviceAreas.geom is populated by a DB trigger AFTER the row is inserted,
// so this MUST run async (here), never inline off addServiceArea's returned row.

import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import {
  contractors,
  contractorServices,
  homeowners,
  leadRecipients,
  leads,
  serviceAreas,
} from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'

export const contractorEligible = inngest.createFunction(
  {
    id: 'contractor-eligible',
    name: 'Auto-match awaiting-coverage leads to a newly-eligible contractor',
    triggers: [{ event: INNGEST_EVENTS.CONTRACTOR_ELIGIBLE }],
    retries: 3,
  },
  async ({ event, step }) => {
    const contractorId = event.data.contractorId as string | undefined
    if (!contractorId) return { ok: false, reason: 'missing contractorId' }

    // 1. Match: find awaiting open leads this verified contractor now covers, and
    //    in one tx per lead, offer it + clear the awaiting flag.
    const matched = await step.run('match', async () => {
      const [c] = await db
        .select({ status: contractors.verificationStatus })
        .from(contractors)
        .where(eq(contractors.id, contractorId))
        .limit(1)
      if (!c || c.status !== 'verified') return [] as { leadId: string; homeownerUserId: string }[]

      // Inverted matching predicate (same ST_Covers as findEligibleContractors,
      // pivoted to this one contractor): open + awaiting leads whose point falls
      // inside any of this contractor's areas for a service it offers.
      const candidates = await db
        .selectDistinct({ leadId: leads.id, homeownerUserId: homeowners.userId })
        .from(leads)
        .innerJoin(homeowners, eq(homeowners.id, leads.homeownerId))
        .innerJoin(
          contractorServices,
          and(
            eq(contractorServices.contractorId, contractorId),
            eq(contractorServices.serviceId, leads.serviceId),
          ),
        )
        .innerJoin(serviceAreas, eq(serviceAreas.contractorId, contractorId))
        .where(
          and(
            eq(leads.awaitingCoverage, true),
            eq(leads.status, 'open'),
            isNotNull(serviceAreas.geom),
            sql`ST_Covers(${serviceAreas.geom}, ST_SetSRID(ST_MakePoint(${leads.lng}, ${leads.lat}), 4326)::geography)`,
          ),
        )
        .limit(200)
      if (candidates.length === 0) return []

      const done: { leadId: string; homeownerUserId: string }[] = []
      for (const row of candidates) {
        await db.transaction(async (tx) => {
          await tx
            .insert(leadRecipients)
            .values({ leadId: row.leadId, contractorId, status: 'offered' })
            .onConflictDoNothing()
          // Clear the flag (guarded so a concurrent run is a no-op).
          await tx
            .update(leads)
            .set({ awaitingCoverage: false })
            .where(and(eq(leads.id, row.leadId), eq(leads.awaitingCoverage, true)))
        })
        done.push(row)
      }
      return done
    })

    if (matched.length === 0) return { ok: true, contractorId, matched: 0 }

    // 2. Notify: the homeowner (a roofer is finally available) + the contractor
    //    (reuse the lead-created fan-out, which notifies the current recipients —
    //    now this contractor — with its own dedupKey).
    await step.run('notify', async () => {
      await Promise.all(
        matched.map((m) =>
          sendNotification({
            userId: m.homeownerUserId,
            type: 'LEAD',
            title: 'A roofer is now available for your job',
            body: 'Good news — a roofer who covers your area just joined Hommy. Open your request to see them.',
            actionUrl: '/homeowner',
            entityType: 'LEAD',
            entityId: m.leadId,
            dedupKey: `coverage_matched:${m.leadId}`,
          }).catch((err) => console.error('[contractor-eligible] homeowner notify', err)),
        ),
      )
      // Contractor-side bell/push/email + live inbox refresh via the existing job.
      await Promise.all(
        matched.map((m) =>
          inngest
            .send({ name: INNGEST_EVENTS.LEAD_CREATED, data: { leadId: m.leadId } })
            .catch((err) => console.error('[contractor-eligible] lead-created emit', err)),
        ),
      )
    })

    return { ok: true, contractorId, matched: matched.length }
  },
)
