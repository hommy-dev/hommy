// Prospect email enrichment — the TypeScript replacement for the old Python
// worker (no AI). Two functions:
//   • prospectEnrich     — processes ONE prospect: claim its job row, crawl its
//                          website for an email, run free checks, write back.
//   • prospectEnrichDrain — a 15-min cron that re-emits PROSPECT_ENRICH events
//                          for any job left queued / retryable / stale-claimed,
//                          so nothing is stranded if an event was lost or a run
//                          crashed mid-flight.
//
// The prospect_enrichment_jobs row is the source of truth + idempotency ledger:
// the atomic claim makes at-least-once event delivery safe (a duplicate event
// finds no claimable row and no-ops).

import { and, eq, lt, or, sql } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractorProspects, prospectEnrichmentJobs } from '@/lib/db/schema'
import { findEmailForProspect } from '@/lib/recruitment/email-finder'

const MAX_ATTEMPTS = 3
const STALE_CLAIM_MINUTES = 30

/**
 * Atomically claim a prospect's enrichment job. Returns true only if THIS call
 * moved the row to 'claimed' (so concurrent/duplicate events can't double-process).
 */
async function claimJob(prospectId: string): Promise<boolean> {
  const rows = await db
    .update(prospectEnrichmentJobs)
    .set({
      status: 'claimed',
      claimedAt: new Date(),
      lockedBy: 'inngest',
      attempts: sql`${prospectEnrichmentJobs.attempts} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(prospectEnrichmentJobs.prospectId, prospectId),
        or(
          eq(prospectEnrichmentJobs.status, 'queued'),
          and(
            eq(prospectEnrichmentJobs.status, 'error'),
            lt(prospectEnrichmentJobs.attempts, MAX_ATTEMPTS),
          ),
        ),
      ),
    )
    .returning({ id: prospectEnrichmentJobs.id })
  return rows.length === 1
}

async function finishJob(prospectId: string, status: 'done' | 'error', lastError: string | null) {
  await db
    .update(prospectEnrichmentJobs)
    .set({ status, lastError, updatedAt: new Date() })
    .where(eq(prospectEnrichmentJobs.prospectId, prospectId))
}

export const prospectEnrich = inngest.createFunction(
  {
    id: 'prospect-enrich',
    name: 'Find & verify one prospect email (crawl-first, no AI)',
    triggers: [{ event: INNGEST_EVENTS.PROSPECT_ENRICH }],
    concurrency: { limit: 4 }, // polite, parallel crawling
    retries: 2,
  },
  async ({ event, step }) => {
    const prospectId = event.data.prospectId as string | undefined
    if (!prospectId) return { ok: false, reason: 'no prospectId' }

    // 1) Atomic claim — idempotency gate against duplicate/cron-replayed events.
    const claimed = await step.run('claim', () => claimJob(prospectId))
    if (!claimed) return { ok: true, skipped: 'already claimed/done/exhausted' }

    // 2) Load the prospect's site info.
    const prospect = await step.run('load', async () => {
      const [row] = await db
        .select({
          website: contractorProspects.website,
          domain: contractorProspects.domain,
          companyName: contractorProspects.companyName,
          city: contractorProspects.city,
        })
        .from(contractorProspects)
        .where(eq(contractorProspects.id, prospectId))
        .limit(1)
      return row ?? null
    })
    if (!prospect) {
      await step.run('mark-missing', () => finishJob(prospectId, 'error', 'prospect missing'))
      return { ok: false, reason: 'prospect missing' }
    }

    // 3) Find the email (crawl + free checks; no paid calls in the default path).
    const result = await step.run('find-email', () =>
      findEmailForProspect({
        website: prospect.website,
        domain: prospect.domain,
        companyName: prospect.companyName,
        city: prospect.city,
      }),
    )

    // 4) Write back the prospect + finish the job.
    await step.run('writeback', async () => {
      if (result.status === 'no_email') {
        await db
          .update(contractorProspects)
          .set({ enrichmentStatus: 'no_email', updatedAt: new Date() })
          .where(eq(contractorProspects.id, prospectId))
        await finishJob(prospectId, 'done', result.reason)
        return
      }
      try {
        await db
          .update(contractorProspects)
          .set({
            email: result.email,
            emailConfidence: result.confidence,
            enrichmentStatus: result.status, // 'email_found' | 'email_verified'
            updatedAt: new Date(),
          })
          .where(eq(contractorProspects.id, prospectId))
        await finishJob(prospectId, 'done', null)
      } catch (err) {
        // Another prospect already owns this email (contractor_prospects_email_uq).
        // Treat as no_email/done — parity with the Python worker's unique-violation branch.
        await db
          .update(contractorProspects)
          .set({ enrichmentStatus: 'no_email', updatedAt: new Date() })
          .where(eq(contractorProspects.id, prospectId))
        await finishJob(prospectId, 'done', `duplicate email: ${String(err).slice(0, 200)}`)
      }
    })

    return { ok: true, status: result.status, confidence: result.confidence }
  },
)

export const prospectEnrichDrain = inngest.createFunction(
  {
    id: 'prospect-enrich-drain',
    name: 'Re-emit enrichment events for stuck jobs',
    triggers: [{ cron: '*/15 * * * *' }],
  },
  async ({ step }) => {
    const ids = await step.run('find-stuck', async () => {
      const staleCutoff = new Date(Date.now() - STALE_CLAIM_MINUTES * 60_000)
      const rows = await db
        .select({ prospectId: prospectEnrichmentJobs.prospectId })
        .from(prospectEnrichmentJobs)
        .where(
          or(
            eq(prospectEnrichmentJobs.status, 'queued'),
            and(
              eq(prospectEnrichmentJobs.status, 'error'),
              lt(prospectEnrichmentJobs.attempts, MAX_ATTEMPTS),
            ),
            and(
              eq(prospectEnrichmentJobs.status, 'claimed'),
              lt(prospectEnrichmentJobs.claimedAt, staleCutoff),
            ),
          ),
        )
        .limit(200)
      return rows.map((r) => r.prospectId)
    })

    if (ids.length > 0) {
      await step.sendEvent(
        're-enqueue',
        ids.map((prospectId) => ({ name: INNGEST_EVENTS.PROSPECT_ENRICH, data: { prospectId } })),
      )
    }
    return { ok: true, reEmitted: ids.length }
  },
)
