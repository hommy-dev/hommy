/**
 * Diagnose why a lead matched zero contractors.
 *
 *   tsx scripts/diagnose-lead.ts [leadId]
 *
 * With no leadId it uses the most recent lead. Prints, step by step, the exact
 * reason the geographic matching did or didn't offer the lead to each company:
 * coordinates present? geom populated? point inside the coverage shape?
 *
 * Requires DATABASE_URL (same as the app).
 */

import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { db } from '../src/lib/db'
import { findEligibleContractors } from '../src/lib/leads/matching'

type Row = Record<string, unknown>

async function main() {
  const args = process.argv.slice(2)
  const fix = args.includes('--fix')
  const argId = args.find((a) => !a.startsWith('--'))

  if (fix) {
    // Re-fire the geom trigger for every area (area_type is always set), so any
    // row saved before the trigger existed gets its geom recomputed.
    const res = (await db.execute(sql`
      update service_areas set area_type = area_type
      where geom is null
      returning id
    `)) as unknown as Row[]
    console.log(`\n🔧 Recomputed geom for ${res.length} area(s) that had none.\n`)
  }

  // 1) The lead
  const leadRows = (await db.execute(sql`
    select l.id, l.service_id, l.lat, l.lng, l.city, l.state, l.status,
           s.slug as service_slug, s.name as service_name
    from leads l
    join services s on s.id = l.service_id
    ${argId ? sql`where l.id = ${argId}` : sql``}
    order by l.created_at desc
    limit 1
  `)) as unknown as Row[]

  const lead = leadRows[0]
  if (!lead) {
    console.error('No lead found', argId ? `for id ${argId}` : '(table empty)')
    process.exit(1)
  }

  console.log('\n=== LEAD ===')
  console.log({
    id: lead.id,
    service: `${lead.service_slug} (${lead.service_id})`,
    coords: { lat: lead.lat, lng: lead.lng },
    place: [lead.city, lead.state].filter(Boolean).join(', ') || '(none)',
    status: lead.status,
  })

  if (lead.lat == null || lead.lng == null) {
    console.log(
      '\n❌ REASON: lead has no lat/lng — geographic matching returns nobody.\n' +
        '   The address must be picked from the autocomplete so coordinates are captured.',
    )
    process.exit(0)
  }

  const serviceId = lead.service_id as string
  const lat = Number(lead.lat)
  const lng = Number(lead.lng)

  // 2) PostGIS present?
  try {
    await db.execute(sql`select postgis_version()`)
  } catch {
    console.log(
      '\n❌ REASON: PostGIS is not enabled on this database — matching uses ST_Covers.\n' +
        '   Run `pnpm db:migrate` (migration 0006 runs CREATE EXTENSION postgis).',
    )
    process.exit(0)
  }

  // 3) Verified contractors offering this service
  const offering = (await db.execute(sql`
    select count(*)::int as n
    from contractors c
    join contractor_services cs
      on cs.contractor_id = c.id and cs.service_id = ${serviceId}
    where c.verification_status = 'verified'
  `)) as unknown as Row[]
  console.log('\n=== CANDIDATES ===')
  console.log(`Verified contractors offering this service: ${offering[0]?.n ?? 0}`)

  // 4) Per-area breakdown for every contractor that offers the service
  //    (verified or not), with geom/coverage diagnostics.
  const areas = (await db.execute(sql`
    select c.company_name,
           c.verification_status,
           (cs.contractor_id is not null) as offers_service,
           sa.label,
           sa.area_type,
           sa.radius_km,
           (sa.geom is null) as geom_is_null,
           ST_Covers(sa.geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) as covers_point,
           round((ST_Distance(sa.geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) / 1000.0)::numeric, 1) as dist_km
    from service_areas sa
    join contractors c on c.id = sa.contractor_id
    left join contractor_services cs
      on cs.contractor_id = c.id and cs.service_id = ${serviceId}
    order by covers_point desc nulls last, dist_km asc nulls last
  `)) as unknown as Row[]

  console.log('\n=== SERVICE AREAS (all companies) ===')
  if (areas.length === 0) {
    console.log('No service areas exist at all.')
  } else {
    for (const a of areas) {
      console.log(
        `${a.covers_point ? '✅' : '  '} ${a.company_name} · ${a.label ?? '(no label)'} · ` +
          `${a.area_type}${a.radius_km ? ` ${a.radius_km}km` : ''} · ` +
          `geom_null=${a.geom_is_null} · covers=${a.covers_point} · dist=${a.dist_km}km · ` +
          `verified=${a.verification_status === 'verified'} · offers=${a.offers_service}`,
      )
    }
  }

  // 5) The actual function the app uses
  const eligible = await findEligibleContractors({ serviceId, lat, lng })
  console.log('\n=== findEligibleContractors() RESULT ===')
  console.log(`Matched ${eligible.length} contractor(s):`, eligible.map((e) => e.contractorId))

  if (eligible.length === 0) {
    console.log(
      '\nLikely cause — look above for the first failing condition:\n' +
        ' • geom_null=true  → the area was saved before the geom trigger; re-save it, or run the backfill.\n' +
        ' • covers=false    → the job point is outside every coverage shape (check the radius / centre).\n' +
        ' • verified=false  → the company is not verified.\n' +
        ' • offers=false    → the company does not offer this service.',
    )
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
