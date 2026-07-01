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
import { contractorProspects } from '../src/lib/db/schema'
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

  const [p] = await db
    .insert(contractorProspects)
    .values({
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
  console.log(`  id       : ${p.id}`)
  console.log(`  company  : ${TEST_TAG} Roofing (${stamp})`)
  console.log(`  prefill  : company=example, website, phone, Austin TX`)
  console.log('\nClaim link the roofer would click (open in a fresh/incognito window):\n')
  console.log(`  ${url}`)
  console.log('\nLocal equivalent (if testing on localhost):')
  console.log(`  http://localhost:3000/claim/${token}`)
  console.log('\nCleanup when done:')
  console.log('  npx tsx scripts/make-claim-link.ts --cleanup')
  console.log('─────────────────────────────────────────────\n')

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
