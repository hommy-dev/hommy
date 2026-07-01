/**
 * One-off catch-up for the fresh-area timing gap.
 *
 * When a homeowner posts into a never-scraped area, sendAreaOutreach fires
 * before enrichment has found any emails, so it emails no one; enrichment then
 * finds the emails minutes later, but (before this fix) nothing re-sent. Those
 * now-reachable roofers sit at "Pending" forever.
 *
 * This script finds every OPEN, still-awaiting-coverage lead and re-runs
 * sendAreaOutreach for its area, so every prospect that has since become
 * reachable gets the job now. It reuses the real send path, so every cap,
 * cooldown, opt-out, guardrail and daily-budget gate still applies — a prospect
 * already emailed won't be emailed again.
 *
 * SAFETY: live mode sends REAL emails (unless RECRUITMENT_TEST_REDIRECT is set).
 * It is a no-op preview unless you pass --yes.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-awaiting-lead-outreach.ts                  # dry run (lists areas)
 *   pnpm tsx scripts/backfill-awaiting-lead-outreach.ts --yes            # actually send
 *   pnpm tsx scripts/backfill-awaiting-lead-outreach.ts --reset --yes    # reset already-sent
 *       prospects to first-touch (frees today's budget), then send. Use after an
 *       accidental test-redirected send to deliver a proper FIRST email for real.
 */

import 'dotenv/config'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorProspects, leads } from '@/lib/db/schema'
import { OUTREACH_AREA_RADIUS_METERS } from '@/lib/config/recruitment'
import { sendAreaOutreach } from '@/lib/recruitment/outreach-sync'

/**
 * Reset already-sent prospects near a point back to first-touch state. Use after
 * an accidental test-redirected send, so a real resend goes out as the INITIAL
 * email (not a "Me again" follow-up) and today's send budget is freed (clearing
 * lastOutreachAt drops them from "sent today"). Only touches rows we marked
 * 'sent'; never resurrects suppressed / bounced / opted-out addresses.
 */
async function resetAreaOutreach(serviceId: string, lat: number, lng: number): Promise<number> {
  const point = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`
  const prospectPoint = sql`ST_SetSRID(ST_MakePoint(${contractorProspects.lng}, ${contractorProspects.lat}), 4326)::geography`
  const rows = await db
    .update(contractorProspects)
    .set({ outreachStatus: 'pending', outreachCount: 0, lastOutreachAt: null, updatedAt: new Date() })
    .where(
      and(
        eq(contractorProspects.serviceId, serviceId),
        eq(contractorProspects.outreachStatus, 'sent'),
        isNotNull(contractorProspects.lat),
        isNotNull(contractorProspects.lng),
        sql`ST_DWithin(${prospectPoint}, ${point}, ${OUTREACH_AREA_RADIUS_METERS})`,
      ),
    )
    .returning({ id: contractorProspects.id })
  return rows.length
}

async function main() {
  const live = process.argv.includes('--yes')
  const reset = process.argv.includes('--reset')

  const awaiting = await db
    .select({
      id: leads.id,
      serviceId: leads.serviceId,
      lat: leads.lat,
      lng: leads.lng,
      city: leads.city,
      state: leads.state,
    })
    .from(leads)
    .where(
      and(
        eq(leads.status, 'open'),
        eq(leads.awaitingCoverage, true),
        isNotNull(leads.lat),
        isNotNull(leads.lng),
      ),
    )

  // Dedupe by service + ~1km-rounded point: many leads in one town share roofers.
  const seen = new Set<string>()
  const areas = awaiting.filter((l) => {
    const key = `${l.serviceId}:${l.lat!.toFixed(2)}:${l.lng!.toFixed(2)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  console.log(
    `Found ${awaiting.length} open awaiting-coverage lead(s) across ${areas.length} distinct area(s).`,
  )

  if (reset) {
    let totalReset = 0
    for (const a of areas) {
      const where = [a.city, a.state].filter(Boolean).join(', ') || `${a.lat},${a.lng}`
      const n = await resetAreaOutreach(a.serviceId, a.lat!, a.lng!)
      totalReset += n
      console.log(`  reset ${n} prospect(s) to first-touch in ${where}`)
    }
    console.log(`Reset ${totalReset} prospect(s) total.\n`)
  }

  if (!live) {
    for (const a of areas) {
      console.log(`  • ${[a.city, a.state].filter(Boolean).join(', ') || `${a.lat},${a.lng}`}`)
    }
    console.log('\nDRY RUN. No emails sent. Re-run with --yes to send.')
    return
  }

  let totalSent = 0
  for (const a of areas) {
    const where = [a.city, a.state].filter(Boolean).join(', ') || `${a.lat},${a.lng}`
    const res = await sendAreaOutreach({ serviceId: a.serviceId, lat: a.lat!, lng: a.lng! })
    totalSent += res.sent
    console.log(
      `  • ${where}: selected ${res.selected}, sent ${res.sent}` +
        (res.reason ? ` (${res.reason})` : ''),
    )
  }
  console.log(`\nDone. ${totalSent} email(s) sent across ${areas.length} area(s).`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
