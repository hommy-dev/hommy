import 'dotenv/config'
import { and, desc, isNotNull, isNull, inArray, sql } from 'drizzle-orm'
import { db } from '../src/lib/db'
import { contractorProspects } from '../src/lib/db/schema'

async function main() {
  const rows = await db
    .select({
      id: contractorProspects.id,
      company: contractorProspects.companyName,
      city: contractorProspects.city,
      state: contractorProspects.state,
      rating: contractorProspects.rating,
      reviews: contractorProspects.reviewCount,
      email: contractorProspects.email,
      sourceRef: contractorProspects.sourceRef,
      lat: contractorProspects.lat,
      lng: contractorProspects.lng,
    })
    .from(contractorProspects)
    .where(
      and(
        isNotNull(contractorProspects.sourceRef), // real Google place_id → review import
        isNotNull(contractorProspects.email),
        isNotNull(contractorProspects.lat),
        isNull(contractorProspects.convertedToContractorId),
        inArray(contractorProspects.enrichmentStatus, ['email_found', 'email_verified']),
        sql`${contractorProspects.rating} >= 4`, // auto-verify bar
        sql`${contractorProspects.reviewCount} >= 5`,
      ),
    )
    .orderBy(desc(contractorProspects.rating), desc(contractorProspects.reviewCount))
    .limit(8)

  console.log(`\nTop real claim candidates (rating>=4, >=5 reviews, has place_id + email):\n`)
  for (const r of rows) {
    console.log(
      `  ${r.rating}★ (${r.reviews})  ${r.company}  —  ${[r.city, r.state].filter(Boolean).join(', ')}\n` +
        `      id=${r.id}  lat=${r.lat} lng=${r.lng}\n`,
    )
  }
  if (rows.length === 0) console.log('  (none — run discovery/enrichment first)')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
