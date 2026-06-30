/**
 * End-to-end test of the recruitment pipeline, SAFELY (no real contractor is
 * ever emailed). Simulates a homeowner posting a roofing job in an uncovered
 * area, then runs every REAL downstream stage:
 *
 *   1. DISCOVERY   — real Google Places Text Search finds roofers near the point
 *                    and inserts contractor_prospects (+ enrichment jobs).
 *   2. ENRICHMENT  — REAL crawler (src/lib/recruitment/email-finder.ts): opens
 *                    each prospect's website, finds an email, runs the free
 *                    checks (syntax + MX + disposable), writes back exactly like
 *                    the Inngest worker. No AI, no paid APIs.
 *   3. OUTREACH    — real sendAreaOutreach() → real Resend send, but every email
 *                    is redirected to RECRUITMENT_TEST_REDIRECT (see
 *                    recruitment-email.ts), so nothing reaches a real contractor.
 *
 * This drives the same functions the `prospect-enrich` Inngest job calls, just
 * inline (no Inngest dev server needed) so you can watch real results.
 *
 * Usage:
 *   pnpm tsx scripts/test-recruitment-e2e.ts --city="Brooklyn" --state="NY" --lat=40.6782 --lng=-73.9442
 *   pnpm tsx scripts/test-recruitment-e2e.ts ... --enrich=10   # how many sites to crawl (default 10)
 *   pnpm tsx scripts/test-recruitment-e2e.ts ... --reset       # re-enrich already-processed prospects too
 *
 * Requires in .env: DATABASE_URL, GOOGLE_PLACES_API_KEY, RECRUITMENT_RESEND_API_KEY,
 * RECRUITMENT_FROM_EMAIL, UNSUBSCRIBE_SECRET, and RECRUITMENT_TEST_REDIRECT.
 */

import 'dotenv/config'
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { services, contractorProspects } from '@/lib/db/schema'
import { discoverProspectsNear } from '@/lib/recruitment/discovery'
import { findEmailForProspect } from '@/lib/recruitment/email-finder'
import { sendAreaOutreach } from '@/lib/recruitment/outreach-sync'
import { mintInviteToken, mintUnsubscribeToken } from '@/lib/recruitment/invite'
import { googleConfigured } from '@/lib/integrations/google-places-server'
import { recruitmentEmailConfigured, sendRecruitmentEmail, appUrl } from '@/lib/notifications/recruitment-email'

// --send=N sends a capped sample of N (so a big crawl doesn't flood the inbox);
// --no-send skips outreach (stats only); default = sendAreaOutreach (all eligible).
type Args = { city: string; state: string; lat: number; lng: number; enrich: number; reset: boolean; send: number; noSend: boolean }

function parseArgs(argv: string[]): Args {
  const get = (k: string) => argv.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=')
  return {
    city: get('city') ?? 'Brooklyn',
    state: get('state') ?? 'NY',
    lat: Number(get('lat') ?? 40.6782),
    lng: Number(get('lng') ?? -73.9442),
    enrich: Number(get('enrich') ?? 10),
    reset: argv.includes('--reset'),
    send: get('send') !== undefined ? Number(get('send')) : -1,
    noSend: argv.includes('--no-send'),
  }
}

/** Send a capped sample of N eligible prospects (redirected by RECRUITMENT_TEST_REDIRECT). */
async function sendSample(serviceId: string, limit: number) {
  if (limit <= 0) return { selected: 0, sent: 0 }
  const rows = await db
    .select({
      id: contractorProspects.id,
      email: contractorProspects.email,
      companyName: contractorProspects.companyName,
      city: contractorProspects.city,
      rating: contractorProspects.rating,
      outreachCount: contractorProspects.outreachCount,
    })
    .from(contractorProspects)
    .where(
      and(
        eq(contractorProspects.serviceId, serviceId),
        inArray(contractorProspects.enrichmentStatus, ['email_found', 'email_verified']),
        isNotNull(contractorProspects.email),
      ),
    )
    .limit(limit)
  let sent = 0
  for (const c of rows) {
    if (!c.email) continue
    const inviteToken = mintInviteToken(c.id)
    const unsubToken = mintUnsubscribeToken(c.email)
    if (!inviteToken || !unsubToken) continue
    const res = await sendRecruitmentEmail({
      to: c.email,
      companyName: c.companyName,
      city: c.city,
      rating: c.rating,
      isFollowUp: (c.outreachCount ?? 0) > 0,
      claimUrl: `${appUrl()}/claim/${inviteToken}`,
      unsubscribeUrl: `${appUrl()}/unsubscribe/${unsubToken}`,
    })
    if (res.ok) sent++
  }
  return { selected: rows.length, sent }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  console.log('\n=== Recruitment E2E test ===')
  console.log('config:', {
    googlePlaces: googleConfigured(),
    recruitmentEmail: recruitmentEmailConfigured(),
    testRedirect: process.env.RECRUITMENT_TEST_REDIRECT || '(none — would email REAL prospects!)',
    area: `${args.city}, ${args.state} (${args.lat}, ${args.lng})`,
  })

  if (!process.env.RECRUITMENT_TEST_REDIRECT) {
    console.error('\n✋ RECRUITMENT_TEST_REDIRECT is not set. Refusing to run so we never email a real contractor.')
    process.exit(1)
  }

  // Resolve the roofing service.
  const [svc] = await db
    .select({ id: services.id, slug: services.slug })
    .from(services)
    .where(eq(services.slug, 'roofing'))
    .limit(1)
  if (!svc) {
    const all = await db.select({ slug: services.slug }).from(services)
    console.error('\nNo "roofing" service in this DB. Available:', all.map((s) => s.slug))
    process.exit(1)
  }

  // ── Stage 1: DISCOVERY (real Google Places) ────────────────────────────────
  console.log('\n[1/3] Discovery — Google Places Text Search…')
  const discovery = await discoverProspectsNear({
    serviceId: svc.id,
    serviceSlug: svc.slug,
    lat: args.lat,
    lng: args.lng,
    city: args.city,
    state: args.state,
  })
  console.log('   →', { found: discovery.found, inserted: discovery.inserted, queued: discovery.queued })

  // Optional: reset prior enrichment so a re-run actually crawls again.
  if (args.reset) {
    await db
      .update(contractorProspects)
      .set({ enrichmentStatus: 'discovered', email: null, emailConfidence: null, updatedAt: new Date() })
      .where(and(eq(contractorProspects.serviceId, svc.id), sql`${contractorProspects.website} is not null`))
  }

  // ── Stage 2: ENRICHMENT (REAL crawler) ─────────────────────────────────────
  console.log(`\n[2/3] Enrichment — crawling up to ${args.enrich} websites for real emails…`)
  const toEnrich = await db
    .select({
      id: contractorProspects.id,
      companyName: contractorProspects.companyName,
      website: contractorProspects.website,
      domain: contractorProspects.domain,
      city: contractorProspects.city,
    })
    .from(contractorProspects)
    .where(
      and(
        eq(contractorProspects.serviceId, svc.id),
        eq(contractorProspects.enrichmentStatus, 'discovered'),
        sql`${contractorProspects.website} is not null`,
      ),
    )
    .limit(args.enrich)

  let found = 0
  let none = 0
  // Crawl in parallel (independent sites); mirrors the worker's writeback.
  await Promise.all(
    toEnrich.map(async (p) => {
      const result = await findEmailForProspect({
        website: p.website,
        domain: p.domain,
        companyName: p.companyName,
        city: p.city,
      })
      if (result.status === 'no_email') {
        none++
        await db
          .update(contractorProspects)
          .set({ enrichmentStatus: 'no_email', updatedAt: new Date() })
          .where(eq(contractorProspects.id, p.id))
        console.log(`   ✗ no email: ${p.companyName ?? p.id} (${result.reason})`)
        return
      }
      found++
      try {
        await db
          .update(contractorProspects)
          .set({
            email: result.email,
            emailConfidence: result.confidence,
            enrichmentStatus: result.status,
            updatedAt: new Date(),
          })
          .where(eq(contractorProspects.id, p.id))
        console.log(`   ✓ found: ${p.companyName ?? p.id} → ${result.email} (conf ${result.confidence})`)
      } catch {
        await db
          .update(contractorProspects)
          .set({ enrichmentStatus: 'no_email', updatedAt: new Date() })
          .where(eq(contractorProspects.id, p.id))
        console.log(`   ✗ duplicate email skipped: ${p.companyName ?? p.id}`)
      }
    }),
  )
  console.log(`   → crawled ${toEnrich.length}: ${found} with email, ${none} without`)

  // ── Stage 3: OUTREACH (real send, redirected) ──────────────────────────────
  if (args.noSend) {
    console.log('\n[3/3] Outreach — SKIPPED (--no-send). Stats only.')
  } else if (args.send >= 0) {
    console.log(`\n[3/3] Outreach — sending a capped sample of ${args.send} (redirected)…`)
    console.log('   →', await sendSample(svc.id, args.send))
  } else {
    console.log('\n[3/3] Outreach — sendAreaOutreach() → Resend (redirected to test inbox)…')
    console.log('   →', await sendAreaOutreach({ serviceId: svc.id, lat: args.lat, lng: args.lng }))
  }

  // ── Full report (aggregate, from final DB state for this service) ──────────
  const all = await db
    .select({
      email: contractorProspects.email,
      website: contractorProspects.website,
      enrichmentStatus: contractorProspects.enrichmentStatus,
    })
    .from(contractorProspects)
    .where(eq(contractorProspects.serviceId, svc.id))

  const FREE_PROVIDERS = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'live.com', 'msn.com', 'verizon.net', 'att.net', 'comcast.net',
  ])
  const total = all.length
  const withWebsite = all.filter((p) => p.website).length
  const withEmailStatus = all.filter((p) => ['email_found', 'email_verified'].includes(p.enrichmentStatus)).length
  const noEmail = all.filter((p) => p.enrichmentStatus === 'no_email').length
  const notProcessed = all.filter((p) => p.enrichmentStatus === 'discovered').length
  const uniqueEmails = [...new Set(all.filter((p) => p.email).map((p) => p.email!.toLowerCase()))]
  const freeCount = uniqueEmails.filter((e) => FREE_PROVIDERS.has(e.split('@')[1] ?? '')).length
  const ownDomainCount = uniqueEmails.length - freeCount

  console.log('\n=== FULL REPORT ===')
  console.log(`Places discovered (Google):     ${total}`)
  console.log(`  ├─ with a website:            ${withWebsite}`)
  console.log(`  └─ no website (skipped):      ${total - withWebsite}`)
  console.log(`Email found (status):           ${withEmailStatus}`)
  console.log(`No email found:                 ${noEmail}`)
  if (notProcessed) console.log(`Not yet crawled:                ${notProcessed}`)
  console.log(`Unique deliverable emails:      ${uniqueEmails.length}`)
  console.log(`  ├─ own-domain (info@/sales@): ${ownDomainCount}`)
  console.log(`  └─ free providers (gmail…):   ${freeCount}`)
  console.log(`Crawl yield (unique / website): ${withWebsite ? Math.round((uniqueEmails.length / withWebsite) * 100) : 0}%`)
  console.log('\nFound emails:')
  for (const e of uniqueEmails.sort()) console.log(`  • ${e}`)

  console.log('\n=== Done ===')
  console.log(`Check the ${process.env.RECRUITMENT_TEST_REDIRECT} inbox (and spam) + Resend dashboard → Emails.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('E2E test threw:', err)
  process.exit(1)
})
