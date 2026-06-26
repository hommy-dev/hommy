/**
 * Roofing SEO-page scenario seeder — ADDITIVE & idempotent.
 *
 *   pnpm tsx scripts/seed-roofing-scenarios.ts          # add the scenarios
 *   pnpm tsx scripts/seed-roofing-scenarios.ts --clean  # remove them again
 *
 * Purpose: populate enough VERIFIED contractors across different cities so you
 * can eyeball every state the public roofing pages can be in. It only writes
 * contractors + service_areas + contractor_services (no members/auth users —
 * the public pages don't need them), so it runs with just DATABASE_URL and never
 * touches the dev fixtures from scripts/seed.ts.
 *
 * Requires the reference seed first (roofing service + states + cities):
 *   pnpm db:seed
 *
 * Scenarios it produces (TX populated, FL deliberately left empty):
 *
 *   /roofing                      → TX shows a city count, FL shows "Coming soon"
 *   /roofing/texas                → lists ONLY indexable cities (Dallas)
 *   /roofing/florida              → empty onboarding card + noindex
 *   Dallas      (4 verified pros) → INDEXABLE, full roofer grid
 *   Houston     (2 verified pros) → renders cards but noindex (below the bar of 3)
 *   Austin      (1 verified pro)  → renders 1 card but noindex
 *   San Antonio (0 pros)          → "we're onboarding" empty state
 *   + 1 PENDING (unverified) pro in Dallas → proves the verification gate hides it
 *
 * Subtype pages under Dallas vary by supply, so each looks different:
 *   roof-repair → 2 · roof-replacement → 3 · roof-inspection → 2 · storm-damage → 2
 *
 * Roofer profiles (/roofers/[slug]) vary too: rich (logo+license+years+rating),
 * brand-new (no rating yet), and bare (no logo/license). Note: the profile page's
 * Reviews section reads real review rows (which need the homeowner→project chain),
 * so it stays empty here; the star rating on the city-page CARDS uses the
 * denormalized avg_rating column, which we DO set. Run `pnpm db:seed:dev` if you
 * want a couple of contractors with full reviews + portfolio as well.
 */

import 'dotenv/config'
import { createHash } from 'node:crypto'
import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '../src/lib/db'
import {
  services,
  contractors,
  serviceAreas,
  contractorServices,
} from '../src/lib/db/schema'

/** Deterministic UUID from a tag, so rows are stable across re-runs. */
function uid(tag: string): string {
  const h = createHash('sha1').update(`hommy-roofing-scenarios:${tag}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}

const photo = (seed: string) => `https://picsum.photos/seed/${seed}/400/400`

type Sub = 'Repair' | 'Replacement' | 'Inspection' | 'Storm Damage'

type Pro = {
  key: string
  companyName: string
  slug: string
  /** target city this contractor's coverage is centred on (stateSlug/citySlug). */
  city: { state: string; city: string }
  subtypes: Sub[]
  verified: boolean
  bio: string | null
  logo: boolean
  license: string | null
  years: number | null
  rating: number | null
  reviews: number
  score: number
}

const PROS: Pro[] = [
  // ---- Dallas: 4 verified → INDEXABLE, with varied subtypes & profiles ----
  {
    key: 'apex',
    companyName: 'Apex Roofing & Exteriors',
    slug: 'apex-roofing-exteriors',
    city: { state: 'texas', city: 'dallas' },
    subtypes: ['Repair', 'Replacement', 'Inspection', 'Storm Damage'],
    verified: true,
    bio: 'Full-service Dallas roofing contractor since 2006. Tear-offs, repairs, and insurance storm restorations — clean crews, on-time, warrantied.',
    logo: true, license: 'TX-ROOF-10421', years: 18, rating: 4.8, reviews: 47, score: 98,
  },
  {
    key: 'bluebonnet',
    companyName: 'Bluebonnet Roofers',
    slug: 'bluebonnet-roofers',
    city: { state: 'texas', city: 'dallas' },
    subtypes: ['Repair', 'Replacement'],
    verified: true,
    bio: 'Residential re-roofs and leak repairs across the Dallas metro. Honest quotes, no pressure.',
    logo: true, license: 'TX-ROOF-22890', years: 12, rating: 4.6, reviews: 29, score: 86,
  },
  {
    key: 'lonestarpeak',
    companyName: 'Lone Star Peak Roofing',
    slug: 'lone-star-peak-roofing',
    city: { state: 'texas', city: 'dallas' },
    subtypes: ['Storm Damage', 'Inspection'],
    verified: true,
    bio: 'Storm-damage specialists. Free inspections and full insurance-claim help for hail and wind damage.',
    logo: false, license: 'TX-ROOF-33715', years: 7, rating: 4.9, reviews: 15, score: 80,
  },
  {
    key: 'texasstar',
    companyName: 'Texas Star Roofing',
    slug: 'texas-star-roofing',
    city: { state: 'texas', city: 'dallas' },
    subtypes: ['Replacement'],
    verified: true,
    bio: null, // newly onboarded — sparse profile, no reviews yet
    logo: false, license: null, years: 3, rating: null, reviews: 0, score: 55,
  },
  // ---- Dallas: 1 PENDING → must NOT appear anywhere public ----
  {
    key: 'skyline-pending',
    companyName: 'Summit Skyline Roofing (pending)',
    slug: 'summit-skyline-roofing',
    city: { state: 'texas', city: 'dallas' },
    subtypes: ['Repair', 'Replacement'],
    verified: false,
    bio: 'Awaiting verification — should be invisible on all public pages.',
    logo: true, license: 'TX-ROOF-99999', years: 4, rating: null, reviews: 0, score: 40,
  },

  // ---- Houston: 2 verified → renders cards but stays noindex ----
  {
    key: 'gulfcoast',
    companyName: 'Gulf Coast Roofing',
    slug: 'gulf-coast-roofing',
    city: { state: 'texas', city: 'houston' },
    subtypes: ['Repair', 'Replacement', 'Inspection', 'Storm Damage'],
    verified: true,
    bio: 'Houston-area roofing and exteriors. Hurricane and hail restoration a specialty.',
    logo: true, license: 'TX-ROOF-50012', years: 10, rating: 4.7, reviews: 22, score: 84,
  },
  {
    key: 'bayoucity',
    companyName: 'Bayou City Roof Co.',
    slug: 'bayou-city-roof-co',
    city: { state: 'texas', city: 'houston' },
    subtypes: ['Repair', 'Storm Damage'],
    verified: true,
    bio: 'Fast, friendly roof repairs in greater Houston.',
    logo: false, license: 'TX-ROOF-50880', years: 5, rating: 4.5, reviews: 8, score: 70,
  },

  // ---- Austin: 1 verified → renders 1 card but stays noindex ----
  {
    key: 'hillcountry',
    companyName: 'Hill Country Roofing',
    slug: 'hill-country-roofing',
    city: { state: 'texas', city: 'austin' },
    subtypes: ['Repair', 'Replacement', 'Inspection', 'Storm Damage'],
    verified: true,
    bio: 'Austin & Hill Country roofing — metal, tile, and shingle. Locally owned.',
    logo: true, license: 'TX-ROOF-60077', years: 9, rating: 4.8, reviews: 19, score: 88,
  },
  // San Antonio + all of Florida: intentionally NO contractors (empty states).
]

const ALL_KEYS = PROS.map((p) => p.key)
const COVERAGE_RADIUS_KM = 45

async function resolveServiceId(): Promise<string> {
  const [svc] = await db.select({ id: services.id }).from(services).where(eq(services.slug, 'roofing')).limit(1)
  if (!svc) {
    console.error('No "roofing" service found. Run `pnpm db:seed` first (reference data).')
    process.exit(1)
  }
  return svc.id
}

/** City centroid (lat/lng) by state+city slug, via a raw join to states. */
async function resolveCentroid(stateSlug: string, citySlug: string): Promise<{ lat: number; lng: number } | null> {
  const rows = (await db.execute(sql`
    SELECT ci.lat AS lat, ci.lng AS lng
    FROM cities ci JOIN states s ON s.code = ci.state_code
    WHERE s.slug = ${stateSlug} AND ci.slug = ${citySlug}
    LIMIT 1
  `)) as unknown as Array<{ lat: number; lng: number }>
  return rows[0] ?? null
}

async function clean(): Promise<void> {
  const ids = ALL_KEYS.map((k) => uid(`contractor:${k}`))
  // service_areas + contractor_services cascade on contractor delete.
  await db.delete(contractors).where(inArray(contractors.id, ids))
  console.log(`✓ removed ${ids.length} scenario contractors (areas + services cascade)`)
}

async function seed(): Promise<void> {
  const serviceId = await resolveServiceId()
  let made = 0

  for (const p of PROS) {
    const centroid = await resolveCentroid(p.city.state, p.city.city)
    if (!centroid) {
      console.warn(`! skipping ${p.companyName}: city ${p.city.state}/${p.city.city} not found (did you run pnpm db:seed?)`)
      continue
    }

    const id = uid(`contractor:${p.key}`)
    const values = {
      id,
      companyName: p.companyName,
      slug: p.slug,
      bio: p.bio,
      logoUrl: p.logo ? photo(`logo-${p.key}`) : null,
      licenseNumber: p.license,
      yearsInBusiness: p.years,
      verificationStatus: p.verified ? ('verified' as const) : ('pending' as const),
      profileScore: p.score,
      avgRating: p.rating != null ? p.rating.toFixed(2) : null,
      totalReviews: p.reviews,
      referralCode: `SCN-${p.key.toUpperCase().slice(0, 10)}`,
    }
    await db
      .insert(contractors)
      .values(values)
      .onConflictDoUpdate({
        target: contractors.id,
        set: {
          companyName: values.companyName,
          slug: values.slug,
          bio: values.bio,
          logoUrl: values.logoUrl,
          licenseNumber: values.licenseNumber,
          yearsInBusiness: values.yearsInBusiness,
          verificationStatus: values.verificationStatus,
          profileScore: values.profileScore,
          avgRating: values.avgRating,
          totalReviews: values.totalReviews,
        },
      })

    // Coverage: a circle centred on the city centroid → trigger builds geom →
    // ST_Covers(geom, centroid) is true, so this contractor "serves" that city.
    await db
      .insert(serviceAreas)
      .values({
        id: uid(`area:${p.key}`),
        contractorId: id,
        label: `${p.city.city}, ${p.city.state}`,
        areaType: 'circle',
        lat: centroid.lat,
        lng: centroid.lng,
        radiusKm: COVERAGE_RADIUS_KM,
      })
      .onConflictDoUpdate({
        target: serviceAreas.id,
        set: { areaType: 'circle', lat: centroid.lat, lng: centroid.lng, radiusKm: COVERAGE_RADIUS_KM },
      })

    await db
      .insert(contractorServices)
      .values({ contractorId: id, serviceId, subtypes: p.subtypes })
      .onConflictDoUpdate({
        target: [contractorServices.contractorId, contractorServices.serviceId],
        set: { subtypes: p.subtypes },
      })

    made++
  }

  console.log(`✓ seeded ${made} scenario contractors`)

  // ---- Verify what the public pages will actually see ----
  const report = (await db.execute(sql`
    SELECT s.slug AS state_slug, ci.slug AS city_slug, ci.name AS city_name,
      (SELECT count(DISTINCT ct.id)
         FROM contractors ct
         JOIN contractor_services cs ON cs.contractor_id = ct.id AND cs.service_id = ${serviceId}
         JOIN service_areas sa ON sa.contractor_id = ct.id
         WHERE ct.verification_status = 'verified' AND sa.geom IS NOT NULL
           AND ST_Covers(sa.geom, ST_SetSRID(ST_MakePoint(ci.lng, ci.lat), 4326)::geography)
      )::int AS verified_pros
    FROM cities ci JOIN states s ON s.code = ci.state_code
    WHERE (s.slug, ci.slug) IN (
      ('texas','dallas'), ('texas','houston'), ('texas','austin'), ('texas','san-antonio')
    )
    ORDER BY verified_pros DESC
  `)) as unknown as Array<{ state_slug: string; city_slug: string; city_name: string; verified_pros: number }>

  console.log('\n  Verified pros covering each demo city (INDEX_MIN_PROS = 3):')
  for (const r of report) {
    const tag = r.verified_pros >= 3 ? 'INDEXABLE' : r.verified_pros > 0 ? 'renders · noindex' : 'empty state'
    console.log(`    /roofing/${r.state_slug}/${r.city_slug}  →  ${r.verified_pros} pros  (${tag})`)
  }

  console.log('\n  Walk through these URLs:')
  console.log('    /roofing                          (TX = count, FL = "Coming soon")')
  console.log('    /roofing/texas                    (lists indexable cities only)')
  console.log('    /roofing/florida                  (empty onboarding state)')
  console.log('    /roofing/texas/dallas             (4 pros, full grid)')
  console.log('    /roofing/texas/dallas/roof-repair (2 pros)')
  console.log('    /roofing/texas/dallas/roof-replacement (3 pros)')
  console.log('    /roofing/texas/houston            (2 pros, renders + noindex)')
  console.log('    /roofing/texas/austin             (1 pro, renders + noindex)')
  console.log('    /roofing/texas/san-antonio        (0 pros, empty state)')
  console.log('    /roofers/apex-roofing-exteriors   (rich profile)')
  console.log('    /roofers/texas-star-roofing       (brand-new, no reviews)')
  console.log('    /roofers/summit-skyline-roofing   (pending → 404, gate works)')
}

async function main() {
  const cleanMode = process.argv.slice(2).includes('--clean')
  if (cleanMode) await clean()
  else await seed()
  console.log('\nDone.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
