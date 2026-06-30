// `contractor/eligible` — a contractor just became able to serve new areas
// (verified by an admin, or a verified company added/expanded a coverage area).
// Offers them EVERY recent open lead they now cover — not just the
// "awaiting-coverage" backlog. This matters for recruitment: we email roofer B
// "there's a job in your area," B signs up, but roofer A already claimed the one
// awaiting lead — without this, B would see nothing and bounce. Now B sees all
// the recent open jobs nearby (the same ones A is competing for), so a recruited
// signup always lands on real demand, and recruited leads stay competitive.
// Leads that were "awaiting coverage" also get un-flagged + the homeowner told a
// roofer is finally available.
//
// Idempotent: lead_recipients has a unique (lead, contractor) index, so re-runs
// don't duplicate offers — and we only notify for offers we actually just made.
//
// NOTE: serviceAreas.geom is populated by a DB trigger AFTER the row is inserted,
// so this MUST run async (here), never inline off addServiceArea's returned row.

import { and, eq, gte, isNotNull, sql } from 'drizzle-orm'

// How far back an open lead can be and still be offered to a newly-active roofer.
// Recent enough to be live demand, not a stale backlog.
const OPEN_LEAD_MATCH_WINDOW_DAYS = 21
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

    // 1. Match: every RECENT OPEN lead this verified contractor now covers (not
    //    just the awaiting backlog). Offer each to them; for ones that were
    //    awaiting coverage, also clear the flag. We only act on offers we
    //    actually just created (returning), so replays don't re-notify.
    const matched = await step.run('match', async () => {
      const [c] = await db
        .select({ status: contractors.verificationStatus })
        .from(contractors)
        .where(eq(contractors.id, contractorId))
        .limit(1)
      if (!c || c.status !== 'verified') {
        return [] as { leadId: string; homeownerUserId: string; wasAwaiting: boolean }[]
      }

      // Inverted matching predicate (same ST_Covers as findEligibleContractors,
      // pivoted to this one contractor): recent OPEN leads whose point falls
      // inside any of this contractor's areas for a service it offers.
      const candidates = await db
        .selectDistinct({
          leadId: leads.id,
          homeownerUserId: homeowners.userId,
          wasAwaiting: leads.awaitingCoverage,
        })
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
            eq(leads.status, 'open'),
            gte(leads.createdAt, sql`now() - make_interval(days => ${OPEN_LEAD_MATCH_WINDOW_DAYS})`),
            isNotNull(serviceAreas.geom),
            sql`ST_Covers(${serviceAreas.geom}, ST_SetSRID(ST_MakePoint(${leads.lng}, ${leads.lat}), 4326)::geography)`,
          ),
        )
        .limit(200)
      if (candidates.length === 0) return []

      const offered: { leadId: string; homeownerUserId: string; wasAwaiting: boolean }[] = []
      for (const row of candidates) {
        const newlyOffered = await db.transaction(async (tx) => {
          const ins = await tx
            .insert(leadRecipients)
            .values({ leadId: row.leadId, contractorId, status: 'offered' })
            .onConflictDoNothing()
            .returning({ id: leadRecipients.id })
          if (row.wasAwaiting) {
            // Clear the flag (guarded so a concurrent run is a no-op).
            await tx
              .update(leads)
              .set({ awaitingCoverage: false })
              .where(and(eq(leads.id, row.leadId), eq(leads.awaitingCoverage, true)))
          }
          return ins.length > 0
        })
        if (newlyOffered) offered.push(row)
      }
      return offered
    })

    if (matched.length === 0) return { ok: true, contractorId, matched: 0 }

    // 2. Notify. Only the leads that were AWAITING coverage get the homeowner
    //    "a roofer is now available" note + the lead-created fan-out (those had no
    //    covering roofer before). For already-covered open leads, the new offer
    //    simply appears in this roofer's inbox — we don't re-notify the homeowner
    //    or the other roofers already on that lead.
    const awaitingNow = matched.filter((m) => m.wasAwaiting)
    await step.run('notify', async () => {
      await Promise.all(
        awaitingNow.map((m) =>
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
      await Promise.all(
        awaitingNow.map((m) =>
          inngest
            .send({ name: INNGEST_EVENTS.LEAD_CREATED, data: { leadId: m.leadId } })
            .catch((err) => console.error('[contractor-eligible] lead-created emit', err)),
        ),
      )
    })

    return { ok: true, contractorId, matched: matched.length, awaiting: awaitingNow.length }
  },
)
