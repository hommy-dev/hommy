/**
 * Seed ONE throwaway recruitment prospect and print the exact /claim link a
 * cold-emailed roofer would click. Lets you walk the full post-click flow
 * (claim → prefilled contractor signup → onboarding → dashboard) end-to-end
 * without emailing a real contractor.
 *
 * Both recruitment email types ("join the platform" invite AND "job in your
 * area" lead) point at this same /claim/<token> link — only the copy differs —
 * so this one link exercises the flow for both.
 *
 * Requires (from .env): DATABASE_URL, UNSUBSCRIBE_SECRET.
 * The token is HMAC-signed with UNSUBSCRIBE_SECRET, so it only validates on a
 * deployment that shares BOTH the same database AND the same secret.
 *
 * Usage:
 *   npx tsx scripts/make-claim-link.ts
 *   npx tsx scripts/make-claim-link.ts --base=https://www.hommy.online
 *   npx tsx scripts/make-claim-link.ts --cleanup   # delete prior test prospects
 */

import 'dotenv/config'
import { and, eq, like } from 'drizzle-orm'
import { db } from '../src/lib/db'
import { contractorProspects, services } from '../src/lib/db/schema'
import { mintInviteToken } from '../src/lib/recruitment/invite'

const TEST_TAG = 'CLAIM-FLOW-TEST'

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`)

async function cleanup() {
  const rows = await db
    .delete(contractorProspects)
    .where(and(like(contractorProspects.companyName, `%${TEST_TAG}%`)))
    .returning({ id: contractorProspects.id })
  console.log(`Deleted ${rows.length} test prospect(s).`)
}

async function main() {
  if (!process.env.UNSUBSCRIBE_SECRET) {
    throw new Error('UNSUBSCRIBE_SECRET is not set — cannot mint a valid claim token.')
  }
  if (hasFlag('cleanup')) {
    await cleanup()
    return
  }

  const base = (arg('base') || 'https://www.hommy.online').replace(/\/+$/, '')
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  // A unique email keeps the (email) unique index happy on re-runs.
  const email = `claim-test+${Date.now()}@example.com`

  // --pending → no rating (stays 'pending' for manual license/insurance review).
  // Default → 4.8 / 20 reviews so contractor-claimed AUTO-VERIFIES (rating>=4 AND
  // reviews>=5) and the roofer lands straight on live jobs.
  const pending = hasFlag('pending')
  // Google review/photo import needs a real place_id. Off by default (it collides
  // with the (service_id, source_ref) unique index of the real prospect that owns
  // it); pass --place-id=<a real, unused place_id> to exercise the import path.
  const sourceRef = pending ? null : (arg('place-id') ?? null)
  // Real prospects carry the vertical we discovered them for; set it so the
  // claim provisions a roofing service (→ auto-verified recruit sees jobs).
  // (Query directly — roofingServiceId() uses cacheLife(), N/A outside Next.)
  const [svc] = await db.select({ id: services.id }).from(services).where(eq(services.slug, 'roofing')).limit(1)
  const serviceId = svc?.id ?? null

  const [p] = await db
    .insert(contractorProspects)
    .values({
      serviceId,
      companyName: `${TEST_TAG} Roofing (${stamp})`,
      email,
      emailConfidence: 90,
      phone: '+1 512 555 0142',
      website: 'https://example-roofing-test.com',
      city: 'Austin',
      state: 'TX',
      // Coords so provisioning also seeds the 40km service area on claim.
      lat: 30.2672,
      lng: -97.7431,
      source: 'manual',
      sourceRef, // real place_id → Google reviews/photos auto-import on claim
      rating: pending ? null : '4.80',
      reviewCount: pending ? null : 20,
      enrichmentStatus: 'email_verified',
      outreachStatus: 'sent',
      outreachCount: 1,
    })
    .returning({ id: contractorProspects.id })

  const token = mintInviteToken(p.id)
  if (!token) throw new Error('mintInviteToken returned null (UNSUBSCRIBE_SECRET missing).')

  const url = `${base}/claim/${token}`

  console.log('\n─────────────────────────────────────────────')
  console.log('Test prospect created:')
  console.log(`  id        : ${p.id}`)
  console.log(`  company   : ${TEST_TAG} Roofing (${stamp})`)
  console.log(`  prefill   : company, website, phone, Austin TX`)
  console.log(`  verify    : ${pending ? 'PENDING (manual review path)' : 'AUTO-VERIFY (4.8★ / 20 reviews)'}`)
  console.log(`  google    : ${sourceRef ? `reviews will import (place_id ${sourceRef.slice(0, 12)}…)` : 'none (no place_id)'}`)
  console.log('\nClaim link the roofer would click (open in a fresh/incognito window):\n')
  console.log(`  ${url}`)
  console.log('\nCleanup when done:')
  console.log('  npx tsx scripts/make-claim-link.ts --cleanup')
  console.log('  npx tsx scripts/confirm-test-user.ts --email=<your signup email> --delete')
  console.log('─────────────────────────────────────────────\n')

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
