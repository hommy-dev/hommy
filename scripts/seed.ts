/**
 * Seed script — idempotent.
 *
 *   pnpm db:seed          # reference data only (the roofing `services` row)
 *   pnpm db:seed:dev      # reference data + local dev fixtures
 *   pnpm db:seed -- --dev # same as db:seed:dev
 *
 * Reference data is the multi-vertical backbone: every lead/project references
 * a `service_id`, so the roofing `services` row MUST exist before anything else
 * can be created (see docs/HOMEI_PLATFORM.md §0).
 *
 * Dev fixtures create one verified contractor (with a real Supabase Auth user so
 * you can log in), service areas, sample homeowners, an assigned lead → contact →
 * project → estimate, a pending lead, a submitted review, and a notification — so
 * the dashboard has data to render. Everything is keyed by fixed UUIDs / a fixed
 * email, so re-running updates in place instead of duplicating.
 *
 * Requires: DATABASE_URL. Dev fixtures additionally need
 * NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (to create the auth user).
 */

import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { db } from '../src/lib/db'
import {
  services,
  users,
  contractors,
  serviceAreas,
  contractorServices,
  homeowners,
  leads,
  contacts,
  projects,
  estimates,
  reviews,
  notifications,
} from '../src/lib/db/schema'

// ---------- roofing reference data ----------

const ROOFING = {
  slug: 'roofing',
  name: 'Roofing',
  // Roofing-defined subtypes (live in lead/estimate service_details, never as
  // columns). When a new vertical launches it is a new services row, no migration.
  subtypes: ['Repair', 'Replacement', 'Inspection', 'Storm Damage'],
}

// ---------- fixed fixture identifiers (idempotency keys) ----------

const DEV_CONTRACTOR_EMAIL = 'dev.contractor@homei.test'
const DEV_CONTRACTOR_PASSWORD = 'DevPass123!'

const ID = {
  contractor: '11111111-1111-4111-8111-111111111111',
  area1: '21111111-1111-4111-8111-111111111111',
  area2: '21111111-1111-4111-8111-222222222222',
  homeowner1: '31111111-1111-4111-8111-111111111111',
  homeowner2: '31111111-1111-4111-8111-222222222222',
  homeowner3: '31111111-1111-4111-8111-333333333333',
  homeowner4: '31111111-1111-4111-8111-444444444444',
  homeowner5: '31111111-1111-4111-8111-555555555555',
  leadAssigned: '41111111-1111-4111-8111-111111111111',
  leadPending: '41111111-1111-4111-8111-222222222222',
  lead3: '41111111-1111-4111-8111-333333333333',
  lead4: '41111111-1111-4111-8111-444444444444',
  lead5: '41111111-1111-4111-8111-555555555555',
  contact: '51111111-1111-4111-8111-111111111111',
  project: '61111111-1111-4111-8111-111111111111',
  estimate: '71111111-1111-4111-8111-111111111111',
  review: '81111111-1111-4111-8111-111111111111',
  notification: '91111111-1111-4111-8111-111111111111',
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return v
}

async function findAuthUserIdByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<string | null> {
  let page = 1
  const perPage = 200
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('listUsers failed:', error.message)
      return null
    }
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    )
    if (found) return found.id
    if (data.users.length < perPage) break
    page += 1
    if (page > 50) break
  }
  return null
}

async function seedRoofingService(): Promise<string> {
  const [row] = await db
    .insert(services)
    .values({ slug: ROOFING.slug, name: ROOFING.name, subtypes: ROOFING.subtypes, isActive: true })
    .onConflictDoUpdate({
      target: services.slug,
      set: { name: ROOFING.name, subtypes: ROOFING.subtypes, isActive: true },
    })
    .returning({ id: services.id })
  console.log(`✓ service: ${ROOFING.name} (${row.id})`)
  return row.id
}

async function ensureDevAuthUser(): Promise<string> {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: created, error } = await supabase.auth.admin.createUser({
    email: DEV_CONTRACTOR_EMAIL,
    password: DEV_CONTRACTOR_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Dev Contractor' },
  })

  if (error) {
    const existingId = await findAuthUserIdByEmail(supabase, DEV_CONTRACTOR_EMAIL)
    if (!existingId) {
      console.error('Could not create or find dev auth user:', error.message)
      process.exit(1)
    }
    console.log(`✓ auth user (existing): ${DEV_CONTRACTOR_EMAIL}`)
    return existingId
  }
  console.log(`✓ auth user (created): ${DEV_CONTRACTOR_EMAIL}`)
  return created.user!.id
}

async function seedDevFixtures(serviceId: string): Promise<void> {
  const userId = await ensureDevAuthUser()

  await db
    .insert(users)
    .values({ id: userId, email: DEV_CONTRACTOR_EMAIL, fullName: 'Dev Contractor', phone: '+12145550100', role: 'contractor' })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: DEV_CONTRACTOR_EMAIL, fullName: 'Dev Contractor', role: 'contractor' },
    })

  await db
    .insert(contractors)
    .values({
      id: ID.contractor,
      userId,
      companyName: 'Lone Star Roofing Co.',
      bio: 'Family-owned roofing contractor serving the Dallas metro since 2009.',
      licenseNumber: 'TX-ROOF-44821',
      yearsInBusiness: 16,
      verificationStatus: 'verified',
      plan: 'growth',
      avgRating: '4.80',
      totalReviews: 1,
    })
    .onConflictDoUpdate({
      target: contractors.id,
      set: { userId, companyName: 'Lone Star Roofing Co.', verificationStatus: 'verified', plan: 'growth' },
    })

  for (const area of [
    { id: ID.area1, zipCode: '75201', lat: 32.7876, lng: -96.7994 },
    { id: ID.area2, zipCode: '75204', lat: 32.8121, lng: -96.7866 },
  ]) {
    await db
      .insert(serviceAreas)
      .values({ id: area.id, contractorId: ID.contractor, zipCode: area.zipCode, lat: area.lat, lng: area.lng })
      .onConflictDoUpdate({ target: serviceAreas.id, set: { zipCode: area.zipCode, lat: area.lat, lng: area.lng } })
  }

  await db
    .insert(contractorServices)
    .values({ contractorId: ID.contractor, serviceId, subtypes: ROOFING.subtypes })
    .onConflictDoUpdate({
      target: [contractorServices.contractorId, contractorServices.serviceId],
      set: { subtypes: ROOFING.subtypes },
    })

  for (const ho of [
    { id: ID.homeowner1, fullName: 'Maria Alvarez', email: 'maria.alvarez@example.com', phone: '+12145550111', address: '1820 Live Oak St', zipCode: '75201', city: 'Dallas', state: 'TX', lat: 32.7876, lng: -96.7994 },
    { id: ID.homeowner2, fullName: 'James Carter', email: 'james.carter@example.com', phone: '+12145550112', address: '4400 N Central Expy', zipCode: '75204', city: 'Dallas', state: 'TX', lat: 32.8121, lng: -96.7866 },
  ]) {
    await db.insert(homeowners).values(ho).onConflictDoUpdate({ target: homeowners.id, set: { fullName: ho.fullName, phone: ho.phone } })
  }

  // Assigned lead → contact → project → estimate (the happy path)
  await db
    .insert(leads)
    .values({
      id: ID.leadAssigned,
      homeownerId: ID.homeowner1,
      serviceId,
      serviceDetails: { subtype: 'Replacement', roofSizeSqft: 2200 },
      urgency: 'within_week',
      notes: 'Old asphalt shingle roof, several leaks after last storm.',
      status: 'assigned',
      assignedTo: ID.contractor,
      assignedAt: new Date(),
    })
    .onConflictDoUpdate({ target: leads.id, set: { status: 'assigned', assignedTo: ID.contractor } })

  await db
    .insert(contacts)
    .values({ id: ID.contact, contractorId: ID.contractor, homeownerId: ID.homeowner1, tags: ['replacement', 'storm'], notes: 'Prefers calls after 5pm.' })
    .onConflictDoUpdate({ target: contacts.id, set: { tags: ['replacement', 'storm'] } })

  await db
    .insert(projects)
    .values({
      id: ID.project,
      contractorId: ID.contractor,
      contactId: ID.contact,
      leadId: ID.leadAssigned,
      serviceId,
      stage: 'estimate_sent',
      estimateValue: '14250.00',
      notes: 'Full tear-off + architectural shingles.',
    })
    .onConflictDoUpdate({ target: projects.id, set: { stage: 'estimate_sent', estimateValue: '14250.00' } })

  await db
    .insert(estimates)
    .values({
      id: ID.estimate,
      projectId: ID.project,
      serviceDetails: { roofSizeSqft: 2200, measurementSource: 'manual', material: 'Architectural Asphalt Shingle' },
      laborCost: '6000.00',
      materialsCost: '7000.00',
      lineItems: [
        { label: 'Tear-off & disposal', amount: '2000.00' },
        { label: 'Architectural shingles (22 sq)', amount: '5000.00' },
        { label: 'Underlayment & flashing', amount: '2000.00' },
        { label: 'Labor', amount: '4000.00' },
      ],
      subtotal: '13000.00',
      taxRate: '0.0825',
      taxAmount: '1072.50',
      total: '14072.50',
      scopeNotes: 'Includes 25-year workmanship warranty.',
      status: 'sent',
      acceptToken: 'dev-estimate-accept-token',
      sentAt: new Date(),
    })
    .onConflictDoUpdate({ target: estimates.id, set: { status: 'sent', total: '14072.50' } })

  await db
    .insert(reviews)
    .values({
      id: ID.review,
      projectId: ID.project,
      contractorId: ID.contractor,
      homeownerId: ID.homeowner1,
      rating: 5,
      comment: 'Fast, tidy, and the new roof looks great. Highly recommend.',
      token: 'dev-review-token',
      submittedAt: new Date(),
    })
    .onConflictDoUpdate({ target: reviews.id, set: { rating: 5 } })

  // Pending (unassigned) lead — shows up in the matching/leads queue
  await db
    .insert(leads)
    .values({
      id: ID.leadPending,
      homeownerId: ID.homeowner2,
      serviceId,
      serviceDetails: { subtype: 'Repair', roofSizeSqft: 1800 },
      urgency: 'emergency',
      notes: 'Active leak in master bedroom ceiling.',
      status: 'pending',
    })
    .onConflictDoUpdate({ target: leads.id, set: { status: 'pending' } })

  // A few more fresh assigned leads (not yet worked into projects) so the
  // Leads inbox shows a realistic queue with variety across the urgency filter.
  const moreLeads = [
    {
      hoId: ID.homeowner3,
      leadId: ID.lead3,
      ho: { fullName: 'Priya Nair', email: 'priya.nair@example.com', phone: '+12145550113', address: '2700 Greenville Ave', zipCode: '75206', city: 'Dallas', state: 'TX', lat: 32.8138, lng: -96.7702 },
      subtype: 'Inspection',
      roofSizeSqft: 1600,
      urgency: 'within_month' as const,
      notes: 'Buying the home — wants a pre-purchase roof inspection.',
    },
    {
      hoId: ID.homeowner4,
      leadId: ID.lead4,
      ho: { fullName: 'Derek Boyd', email: 'derek.boyd@example.com', phone: '+12145550114', address: '910 W Davis St', zipCode: '75208', city: 'Dallas', state: 'TX', lat: 32.7459, lng: -96.8326 },
      subtype: 'Storm Damage',
      roofSizeSqft: 2400,
      urgency: 'emergency' as const,
      notes: 'Hail last night, shingles in the yard. Needs a tarp ASAP.',
    },
    {
      hoId: ID.homeowner5,
      leadId: ID.lead5,
      ho: { fullName: 'Sofia Reyes', email: 'sofia.reyes@example.com', phone: '+12145550115', address: '5600 W Lovers Ln', zipCode: '75209', city: 'Dallas', state: 'TX', lat: 32.8516, lng: -96.8273 },
      subtype: 'Replacement',
      roofSizeSqft: 3000,
      urgency: 'planning' as const,
      notes: 'Roof is ~20 years old, planning a replacement next quarter.',
    },
  ]

  for (const m of moreLeads) {
    await db
      .insert(homeowners)
      .values({ id: m.hoId, ...m.ho })
      .onConflictDoUpdate({ target: homeowners.id, set: { fullName: m.ho.fullName, phone: m.ho.phone } })
    await db
      .insert(leads)
      .values({
        id: m.leadId,
        homeownerId: m.hoId,
        serviceId,
        serviceDetails: { subtype: m.subtype, roofSizeSqft: m.roofSizeSqft },
        urgency: m.urgency,
        notes: m.notes,
        status: 'assigned',
        assignedTo: ID.contractor,
        assignedAt: new Date(),
      })
      .onConflictDoUpdate({ target: leads.id, set: { status: 'assigned', assignedTo: ID.contractor } })
  }

  await db
    .insert(notifications)
    .values({
      id: ID.notification,
      userId,
      type: 'lead_new',
      title: 'New roofing lead',
      body: 'Emergency repair request in Dallas, TX (75204).',
      actionUrl: '/dashboard/leads',
      entityType: 'lead',
      entityId: ID.leadPending,
    })
    .onConflictDoNothing({ target: notifications.id })

  console.log('✓ dev fixtures: contractor, 2 areas, 5 homeowners, 5 leads (4 assigned), contact, project, estimate, review, notification')
  console.log(`\n  Log in at /auth/login → ${DEV_CONTRACTOR_EMAIL} / ${DEV_CONTRACTOR_PASSWORD}`)
}

async function main() {
  const dev = process.argv.slice(2).includes('--dev')

  const serviceId = await seedRoofingService()
  if (dev) {
    await seedDevFixtures(serviceId)
  } else {
    console.log('\n  (reference data only — pass --dev to also seed local fixtures)')
  }

  console.log('\nSeed complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
