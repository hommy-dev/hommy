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
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { eq, sql } from 'drizzle-orm'
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
  portfolioProjects,
  portfolioImages,
  reviews,
  states,
  cities,
} from '../src/lib/db/schema'
import { OPERATING_STATES, OPERATING_STATE_NAMES } from '../src/lib/config/service-areas'

type ProjectStage = (typeof projects.stage.enumValues)[number]
type CreditKind = (typeof creditTransactions.kind.enumValues)[number]

/** Deterministic UUID from a tag, so demo rows are stable across re-seeds. */
function uid(tag: string): string {
  const h = createHash('sha1').update(`hommy-seed:${tag}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}

// Stable demo photos (picsum returns a real image per seed, every time).
const photo = (seed: string) => `https://picsum.photos/seed/${seed}/1200/900`

// ---------- reference data ----------

const ROOFING = {
  slug: 'roofing',
  name: 'Roofing',
  subtypes: ['Repair', 'Replacement', 'Inspection', 'Storm Damage'],
}

/** Canonical TX/FL cities for SEO location pages — see scripts/data/build-cities.mjs. */
const CITY_DATA = JSON.parse(
  readFileSync(new URL('./data/us-cities.tx-fl.json', import.meta.url), 'utf8'),
) as { name: string; stateCode: string; lat: number; lng: number; population: number }[]

/** URL-safe slug from a place name (e.g. "Fort Worth" → "fort-worth"). */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const PLANS = [
  { slug: 'free', name: 'Free', priceCents: 0, monthlyCredits: 10, maxMembers: 3, sortOrder: 0, features: { maxPortfolioProjects: 10 } },
  { slug: 'starter', name: 'Starter', priceCents: 9900, monthlyCredits: 60, maxMembers: 3, sortOrder: 1, features: { storm_alerts: true } },
  { slug: 'growth', name: 'Growth', priceCents: 24900, monthlyCredits: 200, maxMembers: 8, sortOrder: 2, features: { storm_alerts: true, analytics: true } },
  { slug: 'pro', name: 'Pro', priceCents: 49900, monthlyCredits: 600, maxMembers: 25, sortOrder: 3, features: { storm_alerts: true, analytics: true, ai_agent: true, marketing: true } },
]

const DEV_CONTRACTOR_EMAIL = 'web.dev.haseeb@gmail.com'
const DEV_PASSWORD = 'Haseeb,.12'

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
    email: 'haseeb.figmenta@gmail.com', fullName: 'Maria Alvarez', phone: '+12145550111',
    address: '1820 Live Oak St', zip: '75201', city: 'Dallas', state: 'TX', lat: 32.7876, lng: -96.7994,
    subtype: 'Replacement', sqft: 2200, urgency: 'within_week' as const, engaged: true,
    notes: 'Old asphalt shingle roof, several leaks after last storm.' },
  { hoId: '31111111-1111-4111-8111-222222222222', leadId: '41111111-1111-4111-8111-222222222222', recipientId: '42111111-1111-4111-8111-222222222222',
    email: 'james.carter@hommy.test', fullName: 'James Carter', phone: '+12145550112',
    address: '4400 N Central Expy', zip: '75204', city: 'Dallas', state: 'TX', lat: 32.8121, lng: -96.7866,
    subtype: 'Repair', sqft: 1800, urgency: 'emergency' as const, engaged: false,
    notes: 'Active leak in master bedroom ceiling.' },
  { hoId: '31111111-1111-4111-8111-333333333333', leadId: '41111111-1111-4111-8111-333333333333', recipientId: '42111111-1111-4111-8111-333333333333',
    email: 'priya.nair@hommy.test', fullName: 'Priya Nair', phone: '+12145550113',
    address: '2700 Greenville Ave', zip: '75206', city: 'Dallas', state: 'TX', lat: 32.8138, lng: -96.7702,
    subtype: 'Inspection', sqft: 1600, urgency: 'within_month' as const, engaged: false,
    notes: 'Buying the home — wants a pre-purchase roof inspection.' },
  { hoId: '31111111-1111-4111-8111-444444444444', leadId: '41111111-1111-4111-8111-444444444444', recipientId: '42111111-1111-4111-8111-444444444444',
    email: 'sofia.reyes@hommy.test', fullName: 'Sofia Reyes', phone: '+12145550114',
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
    // Re-running: make sure a demo login password still works.
    if (password) {
      await supabase.auth.admin.updateUserById(userId, { password })
    }
  } else {
    userId = created.user!.id
  }
  await db
    .insert(users)
    .values({ id: userId, email, fullName, phone, role, passwordSet: Boolean(password) })
    .onConflictDoUpdate({ target: users.id, set: { email, fullName, phone, role } })
  return userId
}

// ---------- demo helpers ----------

async function ensureMember(
  contractorId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member',
): Promise<void> {
  await db
    .insert(contractorMembers)
    .values({ id: uid(`cm:${contractorId}:${userId}`), contractorId, userId, role, status: 'active' })
    .onConflictDoUpdate({
      target: [contractorMembers.contractorId, contractorMembers.userId],
      set: { role, status: 'active' },
    })
}

async function seedLedger(
  contractorId: string,
  key: string,
  entries: { kind: CreditKind; amount: number; expiresInDays?: number }[],
): Promise<number> {
  let bal = 0
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    bal += e.amount
    const createdAt = new Date(Date.now() - (entries.length - i) * 3 * 86_400_000)
    await db
      .insert(creditTransactions)
      .values({
        id: uid(`ct:${key}:${i}`),
        contractorId,
        kind: e.kind,
        amount: e.amount,
        balanceAfter: bal,
        sourceType: 'seed',
        expiresAt: e.expiresInDays ? new Date(Date.now() + e.expiresInDays * 86_400_000) : null,
        createdAt,
      })
      .onConflictDoUpdate({
        target: creditTransactions.id,
        set: { kind: e.kind, amount: e.amount, balanceAfter: bal, createdAt },
      })
  }
  return bal
}

async function seedCaseStudy(
  contractorId: string,
  key: string,
  cs: {
    title: string
    description: string
    subtype: string
    location: string
    singles?: string[]
    pairs?: [string, string][]
  },
): Promise<void> {
  const singles = cs.singles ?? []
  const pairs = cs.pairs ?? []
  const cover = singles[0] ?? pairs[0]?.[1] ?? null
  const pid = uid(`pp:${key}`)
  await db
    .insert(portfolioProjects)
    .values({
      id: pid,
      contractorId,
      title: cs.title,
      description: cs.description,
      serviceSubtype: cs.subtype,
      location: cs.location,
      coverImageUrl: cover,
      isPublished: true,
      sortOrder: 0,
    })
    .onConflictDoUpdate({
      target: portfolioProjects.id,
      set: { title: cs.title, description: cs.description, serviceSubtype: cs.subtype, location: cs.location, coverImageUrl: cover },
    })

  let order = 0
  for (const url of singles) {
    await db
      .insert(portfolioImages)
      .values({ id: uid(`pi:${key}:s:${order}`), projectId: pid, kind: 'single', imageUrl: url, sortOrder: order })
      .onConflictDoUpdate({ target: portfolioImages.id, set: { imageUrl: url, kind: 'single', sortOrder: order } })
    order++
  }
  for (const [before, after] of pairs) {
    await db
      .insert(portfolioImages)
      .values({ id: uid(`pi:${key}:p:${order}`), projectId: pid, kind: 'before_after', imageUrl: after, beforeUrl: before, sortOrder: order })
      .onConflictDoUpdate({ target: portfolioImages.id, set: { imageUrl: after, beforeUrl: before, kind: 'before_after', sortOrder: order } })
    order++
  }
}

async function seedClientProject(
  supabase: SupabaseClient,
  contractorId: string,
  serviceId: string,
  c: {
    key: string
    name: string
    email: string
    phone: string
    stage: ProjectStage
    value: string
    tags?: string[]
    review?: { rating: number; comment: string }
  },
): Promise<void> {
  const userId = await ensureUser(supabase, c.email, c.name, c.phone, 'homeowner')
  const hoId = uid(`ho:${c.key}`)
  await db
    .insert(homeowners)
    .values({ id: hoId, userId })
    .onConflictDoUpdate({ target: homeowners.id, set: { userId } })

  const contactId = uid(`contact:${c.key}`)
  await db
    .insert(contacts)
    .values({ id: contactId, contractorId, homeownerId: hoId, tags: c.tags ?? [] })
    .onConflictDoUpdate({ target: contacts.id, set: { tags: c.tags ?? [] } })

  const projId = uid(`pj:${c.key}`)
  await db
    .insert(projects)
    .values({ id: projId, contractorId, contactId, serviceId, stage: c.stage, estimateValue: c.value })
    .onConflictDoUpdate({ target: projects.id, set: { stage: c.stage, estimateValue: c.value } })

  if (c.review) {
    await db
      .insert(reviews)
      .values({
        id: uid(`rv:${c.key}`),
        projectId: projId,
        contractorId,
        reviewerType: 'homeowner',
        reviewerId: userId,
        rating: c.review.rating,
        comment: c.review.comment,
        token: uid(`rvt:${c.key}`).replace(/-/g, ''),
        submittedAt: new Date(),
      })
      .onConflictDoUpdate({ target: reviews.id, set: { rating: c.review.rating, comment: c.review.comment } })
  }
}

/**
 * Rich demo: extra team members + portfolio + reviews for company 1, a SECOND
 * company (Summit) where the dev contractor is a member (so the workspace
 * switcher is exercised), and extra job posts for the login homeowner.
 */
async function seedDemo(
  supabase: SupabaseClient,
  serviceId: string,
  devOwnerId: string,
): Promise<void> {
  // ---- Company 1 (Lone Star) extras ----
  const alex = await ensureUser(supabase, 'alex.rivera@hommy.test', 'Alex Rivera', '+12145550131', 'contractor')
  const sam = await ensureUser(supabase, 'sam.park@hommy.test', 'Sam Park', '+12145550132', 'contractor')
  await ensureMember(ID.contractor, alex, 'admin')
  await ensureMember(ID.contractor, sam, 'member')

  await seedCaseStudy(ID.contractor, 'c1-1', {
    title: 'Full roof replacement — Lakewood',
    description: 'Complete tear-off of a 22-square asphalt roof with architectural shingles, new underlayment and flashing. Finished in two days.',
    subtype: 'Replacement', location: 'Dallas, TX',
    singles: [photo('lonestar-1a'), photo('lonestar-1b')],
    pairs: [[photo('lonestar-1-before'), photo('lonestar-1-after')]],
  })
  await seedCaseStudy(ID.contractor, 'c1-2', {
    title: 'Hail damage restoration — Plano',
    description: 'Storm restoration after a spring hailstorm: replaced damaged shingles, ridge vents, and gutters.',
    subtype: 'Storm Damage', location: 'Plano, TX',
    pairs: [[photo('lonestar-2-before'), photo('lonestar-2-after')]],
  })
  await seedCaseStudy(ID.contractor, 'c1-3', {
    title: 'Cedar shake restoration',
    description: 'Detailed restoration of a cedar shake roof on a historic home.',
    subtype: 'Repair', location: 'Highland Park, TX',
    singles: [photo('lonestar-3a'), photo('lonestar-3b'), photo('lonestar-3c')],
  })

  await seedClientProject(supabase, ID.contractor, serviceId, { key: 'c1-ethan', name: 'Ethan Brooks', email: 'ethan.brooks@hommy.test', phone: '+12145550141', stage: 'completed', value: '12800.00', tags: ['replacement'], review: { rating: 5, comment: 'Crew was on time, cleaned up everything, and the roof looks fantastic. Would hire again.' } })
  await seedClientProject(supabase, ID.contractor, serviceId, { key: 'c1-ava', name: 'Ava Sullivan', email: 'ava.sullivan@hommy.test', phone: '+12145550142', stage: 'completed', value: '9400.00', tags: ['repair'], review: { rating: 4, comment: 'Great work and a fair price. Took a day longer than planned but kept us informed.' } })
  await seedClientProject(supabase, ID.contractor, serviceId, { key: 'c1-liam', name: 'Liam Foster', email: 'liam.foster@hommy.test', phone: '+12145550143', stage: 'in_progress', value: '15600.00', tags: ['replacement'] })

  // ---- Company 2 (Summit Exteriors) — dev contractor is a MEMBER here ----
  const C2 = uid('company:summit')
  const [freePlan] = await db.select({ id: plans.id }).from(plans).where(eq(plans.slug, 'free')).limit(1)
  const jordan = await ensureUser(supabase, 'jordan.lee@hommy.test', 'Jordan Lee', '+14695550150', 'contractor')
  const casey = await ensureUser(supabase, 'casey.morgan@hommy.test', 'Casey Morgan', '+14695550151', 'contractor')

  const C2_LOGO = photo('summit-logo')
  await db
    .insert(contractors)
    .values({ id: C2, companyName: 'Summit Exteriors', slug: 'summit-exteriors', bio: 'Roofing & exteriors for North Dallas. Storm-damage specialists who handle the insurance paperwork for you.', logoUrl: C2_LOGO, licenseNumber: 'TX-ROOF-90233', yearsInBusiness: 8, verificationStatus: 'verified', creditBalance: 23, profileScore: 90, avgRating: '5.00', totalReviews: 2 })
    .onConflictDoUpdate({ target: contractors.id, set: { companyName: 'Summit Exteriors', slug: 'summit-exteriors', bio: 'Roofing & exteriors for North Dallas. Storm-damage specialists who handle the insurance paperwork for you.', logoUrl: C2_LOGO, verificationStatus: 'verified', creditBalance: 23, avgRating: '5.00', totalReviews: 2 } })

  await ensureMember(C2, jordan, 'owner')
  await ensureMember(C2, devOwnerId, 'member')
  await ensureMember(C2, casey, 'admin')

  if (freePlan) {
    await db
      .insert(subscriptions)
      .values({ id: uid('sub:c2'), contractorId: C2, planId: freePlan.id, status: 'active', cancelAtPeriodEnd: false })
      .onConflictDoUpdate({ target: subscriptions.id, set: { planId: freePlan.id, status: 'active' } })
  }
  await seedLedger(C2, 'c2', [
    { kind: 'signup_bonus', amount: 25 },
    { kind: 'lead_engagement', amount: -2 },
  ])

  for (const a of [
    { key: 'c2-a1', label: 'Plano, TX', zip: '75024', lat: 33.0198, lng: -96.6989 },
    { key: 'c2-a2', label: 'Frisco, TX', zip: '75034', lat: 33.1507, lng: -96.8236 },
  ]) {
    await db
      .insert(serviceAreas)
      .values({ id: uid(`area:${a.key}`), contractorId: C2, label: a.label, zipCode: a.zip, areaType: 'circle', lat: a.lat, lng: a.lng, radiusKm: 50 })
      .onConflictDoUpdate({ target: serviceAreas.id, set: { areaType: 'circle', label: a.label, lat: a.lat, lng: a.lng, radiusKm: 50 } })
  }
  await db
    .insert(contractorServices)
    .values({ contractorId: C2, serviceId, subtypes: ['Repair', 'Replacement', 'Storm Damage'] })
    .onConflictDoUpdate({ target: [contractorServices.contractorId, contractorServices.serviceId], set: { subtypes: ['Repair', 'Replacement', 'Storm Damage'] } })

  await seedCaseStudy(C2, 'c2-1', {
    title: 'Storm restoration — Frisco',
    description: 'Full insurance-claim restoration after hail. New shingles, gutters, and downspouts.',
    subtype: 'Storm Damage', location: 'Frisco, TX',
    singles: [photo('summit-1a')],
    pairs: [[photo('summit-1-before'), photo('summit-1-after')]],
  })
  await seedCaseStudy(C2, 'c2-2', {
    title: 'Standing-seam metal roof — Prosper',
    description: 'Standing-seam metal roof on a modern new build.',
    subtype: 'Replacement', location: 'Prosper, TX',
    singles: [photo('summit-2a'), photo('summit-2b')],
  })

  await seedClientProject(supabase, C2, serviceId, { key: 'c2-grace', name: 'Grace Kim', email: 'grace.kim@hommy.test', phone: '+14695550161', stage: 'completed', value: '18900.00', tags: ['storm'], review: { rating: 5, comment: 'Summit handled our storm claim start to finish. Stress-free and the roof is perfect.' } })
  await seedClientProject(supabase, C2, serviceId, { key: 'c2-lucas', name: 'Lucas Gray', email: 'lucas.gray@hommy.test', phone: '+14695550162', stage: 'completed', value: '7200.00', tags: ['repair'], review: { rating: 5, comment: 'Quick repair, very professional crew.' } })
  await seedClientProject(supabase, C2, serviceId, { key: 'c2-emma', name: 'Emma Diaz', email: 'emma.diaz@hommy.test', phone: '+14695550163', stage: 'estimate_sent', value: '11200.00', tags: ['replacement'] })

  // Offer two existing homeowner leads to Summit as well, so its dashboard/leads
  // page show real offers (a lead fans out to multiple companies).
  for (const h of [HOMEOWNERS[2], HOMEOWNERS[3]]) {
    await db
      .insert(leadRecipients)
      .values({ id: uid(`lr:c2:${h.leadId}`), leadId: h.leadId, contractorId: C2, status: 'offered' })
      .onConflictDoUpdate({ target: leadRecipients.id, set: { status: 'offered' } })
  }

  // ---- Login homeowner (Maria) — extra requests in different statuses ----
  const mariaHo = HOMEOWNERS[0].hoId
  const mariaExtra = [
    { key: 'maria-2', subtype: 'Inspection', urgency: 'within_month' as const, status: 'open' as const, notes: 'Want a roof inspection before we list the house.', recipients: [ID.contractor, C2] },
    { key: 'maria-3', subtype: 'Storm Damage', urgency: 'emergency' as const, status: 'awarded' as const, notes: 'Wind tore shingles off the north side after the storm.', recipients: [ID.contractor] },
  ]
  for (const m of mariaExtra) {
    const leadId = uid(`lead:${m.key}`)
    await db
      .insert(leads)
      .values({
        id: leadId, homeownerId: mariaHo, serviceId,
        serviceDetails: { subtype: m.subtype }, urgency: m.urgency,
        address: HOMEOWNERS[0].address, zipCode: HOMEOWNERS[0].zip, city: HOMEOWNERS[0].city, state: HOMEOWNERS[0].state, lat: HOMEOWNERS[0].lat, lng: HOMEOWNERS[0].lng,
        notes: m.notes, status: m.status, engageSlots: 3, engagementCreditCost: 1,
      })
      .onConflictDoUpdate({ target: leads.id, set: { status: m.status, notes: m.notes } })
    for (const cId of m.recipients) {
      await db
        .insert(leadRecipients)
        .values({ id: uid(`lr:${m.key}:${cId}`), leadId, contractorId: cId, status: m.status === 'awarded' ? 'won' : 'offered' })
        .onConflictDoUpdate({ target: leadRecipients.id, set: { status: m.status === 'awarded' ? 'won' : 'offered' } })
    }
  }

  console.log('✓ demo: company 1 (3 members, 3 case studies, 2 reviews) + Summit Exteriors (dev is a member, 2 case studies, 2 reviews) + extra homeowner requests')
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

  // Canonical geography for SEO location pages: operating states + their cities.
  for (const code of OPERATING_STATES) {
    const name = OPERATING_STATE_NAMES[code]
    await db
      .insert(states)
      .values({ code, name, slug: slugify(name), isOperating: true })
      .onConflictDoUpdate({ target: states.code, set: { name, slug: slugify(name), isOperating: true } })
  }

  // Dedupe within (stateCode, slug); CITY_DATA is sorted by population desc, so
  // the larger place wins a slug collision (e.g. duplicate "Springfield"-style names).
  const seen = new Set<string>()
  const cityRows = CITY_DATA.flatMap((c) => {
    const slug = slugify(c.name)
    const key = `${c.stateCode}:${slug}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{ id: uid(`city:${key}`), stateCode: c.stateCode, slug, name: c.name, lat: c.lat, lng: c.lng, population: c.population }]
  })
  for (let i = 0; i < cityRows.length; i += 200) {
    await db
      .insert(cities)
      .values(cityRows.slice(i, i + 200))
      .onConflictDoUpdate({
        target: [cities.stateCode, cities.slug],
        set: { name: sql`excluded.name`, lat: sql`excluded.lat`, lng: sql`excluded.lng`, population: sql`excluded.population` },
      })
  }

  console.log(`✓ reference: roofing service + ${PLANS.length} plans + ${OPERATING_STATES.length} states + ${cityRows.length} cities`)
  return { serviceId: svc.id, growthPlanId }
}

async function seedDevFixtures(serviceId: string, growthPlanId: string): Promise<void> {
  const supabase = getAdminClient()
  const ownerId = await ensureUser(supabase, DEV_CONTRACTOR_EMAIL, 'Dev Contractor', '+12145550100', 'contractor', DEV_PASSWORD)

  // Company + owner membership
  const C1_LOGO = photo('lonestar-logo')
  await db
    .insert(contractors)
    .values({ id: ID.contractor, companyName: 'Lone Star Roofing Co.', slug: 'lone-star-roofing-co', bio: 'Family-owned roofing contractor serving the Dallas metro since 2009. Licensed, insured, and known for clean tear-offs and on-time crews.', logoUrl: C1_LOGO, licenseNumber: 'TX-ROOF-44821', yearsInBusiness: 16, verificationStatus: 'verified', creditBalance: 328, profileScore: 100, avgRating: '4.50', totalReviews: 2 })
    .onConflictDoUpdate({ target: contractors.id, set: { companyName: 'Lone Star Roofing Co.', slug: 'lone-star-roofing-co', bio: 'Family-owned roofing contractor serving the Dallas metro since 2009. Licensed, insured, and known for clean tear-offs and on-time crews.', logoUrl: C1_LOGO, verificationStatus: 'verified', creditBalance: 328, profileScore: 100, avgRating: '4.50', totalReviews: 2 } })

  await db
    .insert(contractorMembers)
    .values({ id: ID.member, contractorId: ID.contractor, userId: ownerId, role: 'owner', status: 'active' })
    .onConflictDoUpdate({ target: [contractorMembers.contractorId, contractorMembers.userId], set: { role: 'owner', status: 'active' } })

  await db
    .insert(subscriptions)
    .values({ id: ID.subscription, contractorId: ID.contractor, planId: growthPlanId, status: 'active', cancelAtPeriodEnd: false })
    .onConflictDoUpdate({ target: subscriptions.id, set: { planId: growthPlanId, status: 'active' } })

  await seedLedger(ID.contractor, 'c1', [
    { kind: 'signup_bonus', amount: 50 },
    { kind: 'purchase', amount: 100 },
    { kind: 'plan_grant', amount: 200, expiresInDays: 30 },
    { kind: 'lead_engagement', amount: -2 },
    { kind: 'lead_won', amount: -20 },
  ])

  // Coverage = center point + radius. One generous Dallas-metro area so any
  // Dallas-area address a homeowner picks falls inside it (geographic matching).
  for (const a of [
    { id: ID.area1, label: 'Dallas, TX', zip: '75201', lat: 32.7876, lng: -96.7994, radiusKm: 56 },
    { id: ID.area2, label: 'Uptown Dallas, TX', zip: '75204', lat: 32.8121, lng: -96.7866, radiusKm: 56 },
  ]) {
    await db
      .insert(serviceAreas)
      .values({ id: a.id, contractorId: ID.contractor, label: a.label, zipCode: a.zip, areaType: 'circle', lat: a.lat, lng: a.lng, radiusKm: a.radiusKm })
      .onConflictDoUpdate({ target: serviceAreas.id, set: { areaType: 'circle', label: a.label, zipCode: a.zip, lat: a.lat, lng: a.lng, radiusKm: a.radiusKm } })
  }

  await db
    .insert(contractorServices)
    .values({ contractorId: ID.contractor, serviceId, subtypes: ROOFING.subtypes })
    .onConflictDoUpdate({ target: [contractorServices.contractorId, contractorServices.serviceId], set: { subtypes: ROOFING.subtypes } })

  // Homeowners (authenticated users) + their job posts + the fan-out to the company.
  // The first homeowner gets a password so you can log in and explore that side.
  for (const h of HOMEOWNERS) {
    const hoPassword = h.email === HOMEOWNERS[0].email ? DEV_PASSWORD : undefined
    const hoUserId = await ensureUser(supabase, h.email, h.fullName, h.phone, 'homeowner', hoPassword)
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
        notes: h.notes, status: 'open',
        engageSlots: 3, engagementCreditCost: 1,
      })
      .onConflictDoUpdate({ target: leads.id, set: { status: 'open', notes: h.notes } })

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

  await seedDemo(supabase, serviceId, ownerId)

  console.log('✓ dev fixtures: company + owner, growth subscription, credit ledger, 2 areas, 4 homeowners + leads (1 engaged), contact, project, quote, conversation, notification')
  console.log('\n  Logins (password for both: ' + DEV_PASSWORD + '):')
  console.log(`    Contractor → ${DEV_CONTRACTOR_EMAIL}  (owner of Lone Star + member of Summit — use the workspace switcher)`)
  console.log(`    Homeowner  → ${HOMEOWNERS[0].email}  (multiple requests in different statuses)`)
}

// Every app table, in no particular order — TRUNCATE … CASCADE handles FKs.
// Leaves the `drizzle` migrations table and Supabase `auth` schema alone; the
// seed reconciles auth users (create-or-find), so logins keep working.
const ALL_TABLES = [
  'activity_log', 'reviews', 'score_events', 'estimates', 'projects', 'contacts',
  'messages', 'conversation_participants', 'conversations',
  'lead_recipients', 'leads', 'portfolio_images', 'portfolio_projects',
  'contractor_services', 'service_areas', 'credit_transactions', 'subscriptions',
  'contractor_invitations', 'contractor_members', 'contractors',
  'homeowners', 'notifications', 'push_subscriptions', 'users',
  'storm_events', 'plans', 'services',
  'cities', 'states',
]

async function resetDatabase(): Promise<void> {
  const list = ALL_TABLES.map((t) => `"${t}"`).join(', ')
  await db.execute(sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`))
  console.log(`✓ reset: truncated ${ALL_TABLES.length} tables (app data wiped; auth users kept & re-linked)`)
}

async function main() {
  const args = process.argv.slice(2)
  const dev = args.includes('--dev')
  const reset = args.includes('--reset')

  if (reset) {
    await resetDatabase()
  }

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
