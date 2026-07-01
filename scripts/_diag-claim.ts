import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '../src/lib/db'
import {
  contractorProspects,
  contractors,
  contractorServices,
  serviceAreas,
  contractorMembers,
  users,
} from '../src/lib/db/schema'

const prospectId = process.argv[2]
if (!prospectId) throw new Error('pass prospect id')

async function main() {
  const [p] = await db.select().from(contractorProspects).where(eq(contractorProspects.id, prospectId)).limit(1)
  console.log('\n=== PROSPECT ===')
  console.log({
    id: p?.id,
    company: p?.companyName,
    outreachStatus: p?.outreachStatus,
    convertedToContractorId: p?.convertedToContractorId,
    convertedAt: p?.convertedAt,
    sourceRef: p?.sourceRef,
    rating: p?.rating,
    reviewCount: p?.reviewCount,
  })

  const cid = p?.convertedToContractorId
  if (!cid) {
    console.log('\n⚠️  Prospect NOT converted — no contractor linked. The claim cookie did not attribute the signup.')
    return
  }

  const [c] = await db.select().from(contractors).where(eq(contractors.id, cid)).limit(1)
  console.log('\n=== CONTRACTOR ===')
  console.log({
    id: c?.id,
    companyName: c?.companyName,
    verificationStatus: c?.verificationStatus,
    slug: c?.slug,
  })

  const svcs = await db.select().from(contractorServices).where(eq(contractorServices.contractorId, cid))
  console.log(`\n=== SERVICES (${svcs.length}) ===`, svcs.map((s) => s.serviceId))

  const areas = await db.select().from(serviceAreas).where(eq(serviceAreas.contractorId, cid))
  console.log(`\n=== SERVICE AREAS (${areas.length}) ===`, areas.map((a) => ({ label: a.label, hasGeom: !!a.geom })))

  const members = await db.select().from(contractorMembers).where(eq(contractorMembers.contractorId, cid))
  console.log(`\n=== MEMBERS (${members.length}) ===`)
  for (const m of members) {
    const [u] = await db.select().from(users).where(eq(users.id, m.userId)).limit(1)
    console.log({ role: m.role, status: m.status, email: u?.email, userRole: u?.role })
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
