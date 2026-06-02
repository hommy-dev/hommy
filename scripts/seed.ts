/**
 * Seed script (v2) — idempotent.
 *
 *   pnpm db:seed          # reference data only (roofing service + plans)
 *   pnpm db:seed:dev      # reference + local dev fixtures
 *
 * Reference data is required for the app to function: the roofing `services`
 * row (every lead/project references a service) and the `plans` rows (free + 3
 * paid).
 *
 * Dev fixtures build one contractor COMPANY (with a real login as its owner),
 * a growth subscription + starter credits, service areas, four authenticated
 * homeowners who each posted a job, the lead fan-out (all four offered to the
 * company), and one fully-worked lead (engaged → project → quote → conversation)
 * so the dashboard renders real data. Keyed by fixed UUIDs / fixed emails, so
 * re-running updates in place.
 *
 * Requires DATABASE_URL. Dev fixtures also need NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY (to create auth users).
 */

import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { db } from '../src/lib/db'
import {
  services,
  plans,
  users,
  contractors,
  contractorMembers,
  subscriptions,
  creditTransactions,
  serviceAreas,
  contractorServices,
  homeowners,
  leads,
  leadRecipients,
  contacts,
  projects,
  estimates,
  conversations,
  conversationParticipants,
  messages,
  notifications,
} from '../src/lib/db/schema'

// ---------- reference data ----------

const ROOFING = {
  slug: 'roofing',
  name: 'Roofing',
  subtypes: ['Repair', 'Replacement', 'Inspection', 'Storm Damage'],
}

const PLANS = [
  { slug: 'free', name: 'Free', priceCents: 0, monthlyCredits: 10, maxMembers: 1, sortOrder: 0, features: {} },
  { slug: 'starter', name: 'Starter', priceCents: 9900, monthlyCredits: 60, maxMembers: 3, sortOrder: 1, features: { storm_alerts: true } },
  { slug: 'growth', name: 'Growth', priceCents: 24900, monthlyCredits: 200, maxMembers: 8, sortOrder: 2, features: { storm_alerts: true, analytics: true } },
  { slug: 'pro', name: 'Pro', priceCents: 49900, monthlyCredits: 600, maxMembers: 25, sortOrder: 3, features: { storm_alerts: true, analytics: true, ai_agent: true, marketing: true } },
]

const DEV_CONTRACTOR_EMAIL = 'dev.contractor@homei.test'
const DEV_PASSWORD = 'DevPass123!'

const ID = {
  contractor: '11111111-1111-4111-8111-111111111111',
  member: '12111111-1111-4111-8111-111111111111',
  subscription: '13111111-1111-4111-8111-111111111111',
  creditTxn: '14111111-1111-4111-8111-111111111111',
  area1: '21111111-1111-4111-8111-111111111111',
  area2: '21111111-1111-4111-8111-222222222222',
  contact: '51111111-1111-4111-8111-111111111111',
  project: '61111111-1111-4111-8111-111111111111',
  estimate: '71111111-1111-4111-8111-111111111111',
  conversation: '81111111-1111-4111-8111-111111111111',
  partUser: '82111111-1111-4111-8111-111111111111',
  partContractor: '82111111-1111-4111-8111-222222222222',
  msg1: '83111111-1111-4111-8111-111111111111',
  msg2: '83111111-1111-4111-8111-222222222222',
  notification: '91111111-1111-4111-8111-111111111111',
}

// Four homeowners, each with a fixed profile id + a posted lead + an offer.
const HOMEOWNERS = [
  { hoId: '31111111-1111-4111-8111-111111111111', leadId: '41111111-1111-4111-8111-111111111111', recipientId: '42111111-1111-4111-8111-111111111111',
    email: 'maria.alvarez@homei.test', fullName: 'Maria Alvarez', phone: '+12145550111',
    address: '1820 Live Oak St', zip: '75201', city: 'Dallas', state: 'TX', lat: 32.7876, lng: -96.7994,
    subtype: 'Replacement', sqft: 2200, urgency: 'within_week' as const, engaged: true,
    notes: 'Old asphalt shingle roof, several leaks after last storm.' },
  { hoId: '31111111-1111-4111-8111-222222222222', leadId: '41111111-1111-4111-8111-222222222222', recipientId: '42111111-1111-4111-8111-222222222222',
    email: 'james.carter@homei.test', fullName: 'James Carter', phone: '+12145550112',
    address: '4400 N Central Expy', zip: '75204', city: 'Dallas', state: 'TX', lat: 32.8121, lng: -96.7866,
    subtype: 'Repair', sqft: 1800, urgency: 'emergency' as const, engaged: false,
    notes: 'Active leak in master bedroom ceiling.' },
  { hoId: '31111111-1111-4111-8111-333333333333', leadId: '41111111-1111-4111-8111-333333333333', recipientId: '42111111-1111-4111-8111-333333333333',
    email: 'priya.nair@homei.test', fullName: 'Priya Nair', phone: '+12145550113',
    address: '2700 Greenville Ave', zip: '75206', city: 'Dallas', state: 'TX', lat: 32.8138, lng: -96.7702,
    subtype: 'Inspection', sqft: 1600, urgency: 'within_month' as const, engaged: false,
    notes: 'Buying the home — wants a pre-purchase roof inspection.' },
  { hoId: '31111111-1111-4111-8111-444444444444', leadId: '41111111-1111-4111-8111-444444444444', recipientId: '42111111-1111-4111-8111-444444444444',
    email: 'sofia.reyes@homei.test', fullName: 'Sofia Reyes', phone: '+12145550114',
    address: '5600 W Lovers Ln', zip: '75209', city: 'Dallas', state: 'TX', lat: 32.8516, lng: -96.8273,
    subtype: 'Replacement', sqft: 3000, urgency: 'planning' as const, engaged: false,
    notes: 'Roof is ~20 years old, planning a replacement next quarter.' },
]

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return v
}

function getAdminClient(): SupabaseClient {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function findAuthUserIdByEmail(supabase: SupabaseClient, email: string): Promise<string | null> {
  let page = 1
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found.id
    if (data.users.length < 200 || page > 50) break
    page += 1
  }
  return null
}

/** Create (or find) a pre-confirmed auth user and upsert their public.users row. */
async function ensureUser(
  supabase: SupabaseClient,
  email: string,
  fullName: string,
  phone: string,
  role: 'contractor' | 'homeowner',
  password?: string,
): Promise<string> {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: password ?? undefined,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  let userId: string
  if (error) {
    const existing = await findAuthUserIdByEmail(supabase, email)
    if (!existing) {
      console.error(`Could not create or find auth user ${email}: ${error.message}`)
      process.exit(1)
    }
    userId = existing
  } else {
    userId = created.user!.id
  }
  await db
    .insert(users)
    .values({ id: userId, email, fullName, phone, role, passwordSet: Boolean(password) })
    .onConflictDoUpdate({ target: users.id, set: { email, fullName, phone, role } })
  return userId
}

async function seedReference(): Promise<{ serviceId: string; growthPlanId: string }> {
  const [svc] = await db
    .insert(services)
    .values({ slug: ROOFING.slug, name: ROOFING.name, subtypes: ROOFING.subtypes, isActive: true })
    .onConflictDoUpdate({ target: services.slug, set: { name: ROOFING.name, subtypes: ROOFING.subtypes, isActive: true } })
    .returning({ id: services.id })

  let growthPlanId = ''
  for (const p of PLANS) {
    const [row] = await db
      .insert(plans)
      .values({ slug: p.slug, name: p.name, priceCents: p.priceCents, monthlyCredits: p.monthlyCredits, maxMembers: p.maxMembers, sortOrder: p.sortOrder, features: p.features })
      .onConflictDoUpdate({ target: plans.slug, set: { name: p.name, priceCents: p.priceCents, monthlyCredits: p.monthlyCredits, maxMembers: p.maxMembers, sortOrder: p.sortOrder, features: p.features } })
      .returning({ id: plans.id })
    if (p.slug === 'growth') growthPlanId = row.id
  }

  console.log(`✓ reference: roofing service + ${PLANS.length} plans`)
  return { serviceId: svc.id, growthPlanId }
}

async function seedDevFixtures(serviceId: string, growthPlanId: string): Promise<void> {
  const supabase = getAdminClient()
  const ownerId = await ensureUser(supabase, DEV_CONTRACTOR_EMAIL, 'Dev Contractor', '+12145550100', 'contractor', DEV_PASSWORD)

  // Company + owner membership
  await db
    .insert(contractors)
    .values({ id: ID.contractor, companyName: 'Lone Star Roofing Co.', bio: 'Family-owned roofing contractor serving the Dallas metro since 2009.', licenseNumber: 'TX-ROOF-44821', yearsInBusiness: 16, verificationStatus: 'verified', creditBalance: 50, profileScore: 100, avgRating: '4.80', totalReviews: 1 })
    .onConflictDoUpdate({ target: contractors.id, set: { companyName: 'Lone Star Roofing Co.', verificationStatus: 'verified', creditBalance: 50, profileScore: 100 } })

  await db
    .insert(contractorMembers)
    .values({ id: ID.member, contractorId: ID.contractor, userId: ownerId, role: 'owner', status: 'active' })
    .onConflictDoUpdate({ target: [contractorMembers.contractorId, contractorMembers.userId], set: { role: 'owner', status: 'active' } })

  await db
    .insert(subscriptions)
    .values({ id: ID.subscription, contractorId: ID.contractor, planId: growthPlanId, status: 'active', cancelAtPeriodEnd: false })
    .onConflictDoUpdate({ target: subscriptions.id, set: { planId: growthPlanId, status: 'active' } })

  await db
    .insert(creditTransactions)
    .values({ id: ID.creditTxn, contractorId: ID.contractor, kind: 'signup_bonus', amount: 50, balanceAfter: 50, sourceType: 'seed' })
    .onConflictDoNothing({ target: creditTransactions.id })

  for (const a of [
    { id: ID.area1, zip: '75201', lat: 32.7876, lng: -96.7994 },
    { id: ID.area2, zip: '75204', lat: 32.8121, lng: -96.7866 },
  ]) {
    await db
      .insert(serviceAreas)
      .values({ id: a.id, contractorId: ID.contractor, zipCode: a.zip, lat: a.lat, lng: a.lng })
      .onConflictDoUpdate({ target: serviceAreas.id, set: { zipCode: a.zip, lat: a.lat, lng: a.lng } })
  }

  await db
    .insert(contractorServices)
    .values({ contractorId: ID.contractor, serviceId, subtypes: ROOFING.subtypes })
    .onConflictDoUpdate({ target: [contractorServices.contractorId, contractorServices.serviceId], set: { subtypes: ROOFING.subtypes } })

  // Homeowners (authenticated users) + their job posts + the fan-out to the company
  for (const h of HOMEOWNERS) {
    const hoUserId = await ensureUser(supabase, h.email, h.fullName, h.phone, 'homeowner')
    await db
      .insert(homeowners)
      .values({ id: h.hoId, userId: hoUserId })
      .onConflictDoUpdate({ target: homeowners.id, set: { userId: hoUserId } })

    await db
      .insert(leads)
      .values({
        id: h.leadId, homeownerId: h.hoId, serviceId,
        serviceDetails: { subtype: h.subtype, roofSizeSqft: h.sqft },
        urgency: h.urgency, address: h.address, zipCode: h.zip, city: h.city, state: h.state, lat: h.lat, lng: h.lng,
        notes: h.notes, status: h.engaged ? 'filled' : 'open',
        engageSlots: 3, engagementCreditCost: 2, awardCreditCost: 20,
      })
      .onConflictDoUpdate({ target: leads.id, set: { status: h.engaged ? 'filled' : 'open', notes: h.notes } })

    await db
      .insert(leadRecipients)
      .values({
        id: h.recipientId, leadId: h.leadId, contractorId: ID.contractor,
        status: h.engaged ? 'engaged' : 'offered',
        viewedAt: h.engaged ? new Date() : null,
        engagedAt: h.engaged ? new Date() : null,
      })
      .onConflictDoUpdate({ target: leadRecipients.id, set: { status: h.engaged ? 'engaged' : 'offered' } })
  }

  // The engaged lead → contact + project + quote + conversation (the worked path)
  const engaged = HOMEOWNERS[0]
  const engagedUserId = (await db.select({ userId: homeowners.userId }).from(homeowners).where(eq(homeowners.id, engaged.hoId)).limit(1))[0]!.userId

  await db
    .insert(contacts)
    .values({ id: ID.contact, contractorId: ID.contractor, homeownerId: engaged.hoId, tags: ['replacement', 'storm'], notes: 'Prefers calls after 5pm.' })
    .onConflictDoUpdate({ target: contacts.id, set: { tags: ['replacement', 'storm'] } })

  await db
    .insert(projects)
    .values({ id: ID.project, contractorId: ID.contractor, contactId: ID.contact, leadId: engaged.leadId, serviceId, stage: 'estimate_sent', estimateValue: '14250.00', notes: 'Full tear-off + architectural shingles.' })
    .onConflictDoUpdate({ target: projects.id, set: { stage: 'estimate_sent', estimateValue: '14250.00' } })

  await db
    .insert(estimates)
    .values({
      id: ID.estimate, projectId: ID.project,
      serviceDetails: { roofSizeSqft: 2200, measurementSource: 'manual', material: 'Architectural Asphalt Shingle' },
      laborCost: '6000.00', materialsCost: '7000.00',
      lineItems: [
        { label: 'Tear-off & disposal', amount: '2000.00' },
        { label: 'Architectural shingles (22 sq)', amount: '5000.00' },
        { label: 'Underlayment & flashing', amount: '2000.00' },
        { label: 'Labor', amount: '4000.00' },
      ],
      subtotal: '13000.00', taxRate: '0.0825', taxAmount: '1072.50', total: '14072.50',
      scopeNotes: 'Includes 25-year workmanship warranty.', status: 'sent', acceptToken: 'dev-estimate-accept-token',
    })
    .onConflictDoUpdate({ target: estimates.id, set: { status: 'sent', total: '14072.50' } })

  // Conversation between the homeowner (user) and the company (contractor)
  await db
    .insert(conversations)
    .values({ id: ID.conversation, type: 'lead', contextType: 'lead', contextId: engaged.leadId })
    .onConflictDoUpdate({ target: conversations.id, set: { type: 'lead' } })

  await db
    .insert(conversationParticipants)
    .values([
      { id: ID.partUser, conversationId: ID.conversation, participantType: 'user', participantId: engagedUserId },
      { id: ID.partContractor, conversationId: ID.conversation, participantType: 'contractor', participantId: ID.contractor },
    ])
    .onConflictDoNothing({ target: [conversationParticipants.conversationId, conversationParticipants.participantType, conversationParticipants.participantId] })

  await db
    .insert(messages)
    .values([
      { id: ID.msg1, conversationId: ID.conversation, senderType: 'contractor', senderId: ID.contractor, body: 'Hi Maria — thanks for your request. We can come take a look tomorrow afternoon, does that work?', channel: 'platform' },
      { id: ID.msg2, conversationId: ID.conversation, senderType: 'user', senderId: engagedUserId, body: 'Yes, after 5pm works great. Thank you!', channel: 'platform' },
    ])
    .onConflictDoNothing({ target: messages.id })

  await db
    .insert(notifications)
    .values({ id: ID.notification, userId: ownerId, type: 'lead_new', title: 'New roofing lead', body: 'Emergency repair request in Dallas, TX (75204).', actionUrl: '/dashboard/leads', entityType: 'lead', entityId: HOMEOWNERS[1].leadId })
    .onConflictDoNothing({ target: notifications.id })

  console.log('✓ dev fixtures: company + owner, growth subscription, 50 credits, 2 areas, 4 homeowners + leads (1 engaged), contact, project, quote, conversation, notification')
  console.log(`\n  Log in at /auth/login → ${DEV_CONTRACTOR_EMAIL} / ${DEV_PASSWORD}`)
}

async function main() {
  const dev = process.argv.slice(2).includes('--dev')
  const { serviceId, growthPlanId } = await seedReference()
  if (dev) {
    await seedDevFixtures(serviceId, growthPlanId)
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
