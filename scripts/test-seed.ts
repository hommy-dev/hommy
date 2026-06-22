/**
 * Seed every homeowner + contractor SCENARIO for the two test accounts so you
 * can click through each state in the real UI.
 *
 *   pnpm test:seed
 *
 * Accounts (looked up by email; created via Supabase admin if missing):
 *   • Contractor → web.dev.haseeb@gmail.com   (their company is "your" company)
 *   • Homeowner  → haseeb.figmenta@gmail.com   (owns every seeded job)
 *
 * Also creates a few COMPETITOR companies (no logins needed) so a job can show
 * multiple interested contractors with different ratings.
 *
 * Builds one job per scenario, covering every board column on BOTH dashboards:
 *   posted · viewed · interested(talking) · quotes · hired/won · done · done+reviewed · lost
 * with chats, quote cards, accept events, completion + review cards.
 *
 * Run `pnpm test:reset` first for a clean slate. Idempotent (stable UUIDs).
 * Requires DATABASE_URL (+ Supabase admin env if the accounts don't exist yet).
 */

import 'dotenv/config'
import { createHash, randomBytes } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { db } from '../src/lib/db'
import {
  services,
  users,
  contractors,
  contractorMembers,
  homeowners,
  leads,
  leadRecipients,
  contacts,
  projects,
  estimates,
  conversations,
  conversationParticipants,
  messages,
  reviews,
  type MessageMeta,
} from '../src/lib/db/schema'

const CONTRACTOR_EMAIL = 'web.dev.haseeb@gmail.com'
const HOMEOWNER_EMAIL = 'haseeb.figmenta@gmail.com'
const DEFAULT_PASSWORD = 'password123'

type ProjectStage = (typeof projects.stage.enumValues)[number]
type RecipientStatus = (typeof leadRecipients.status.enumValues)[number]
type LeadStatus = (typeof leads.status.enumValues)[number]
type Urgency = (typeof leads.urgency.enumValues)[number]
type EstStatus = (typeof estimates.status.enumValues)[number]

/** Deterministic UUID from a tag, so re-runs upsert in place. */
function uid(tag: string): string {
  const h = createHash('sha1').update(`hommy-test:${tag}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}
const logo = (seed: string) => `https://picsum.photos/seed/${seed}/200/200`
const now = Date.now()
const daysAgo = (d: number) => new Date(now - d * 86_400_000)
const minsAgo = (m: number) => new Date(now - m * 60_000)

const supabase: SupabaseClient | null =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null

// ─────────────────────────────────────────────────────────────────────────────
// account resolution
// ─────────────────────────────────────────────────────────────────────────────

async function findAuthUserId(email: string): Promise<string | null> {
  if (!supabase) return null
  for (let page = 1; page <= 10; page++) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    const match = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (match) return match.id
    if (!data || data.users.length < 200) break
  }
  return null
}

async function ensureUser(email: string, role: 'contractor' | 'homeowner', fullName: string): Promise<string> {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) return existing.id

  if (!supabase) {
    console.error(
      `[test:seed] User ${email} not found, and SUPABASE_SERVICE_ROLE_KEY isn't set to create it.\n` +
        `            Sign up / log in once as ${email} in the app, then re-run — or add the Supabase admin env.`,
    )
    process.exit(1)
  }

  let userId: string | null = null
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (error) {
    userId = await findAuthUserId(email)
    if (!userId) {
      console.error(`[test:seed] could not create or find auth user ${email}: ${error.message}`)
      process.exit(1)
    }
    await supabase.auth.admin.updateUserById(userId, { password: DEFAULT_PASSWORD })
  } else {
    userId = data.user!.id
  }

  await db
    .insert(users)
    .values({ id: userId, email, fullName, role, passwordSet: true })
    .onConflictDoUpdate({ target: users.id, set: { role, fullName } })
  console.log(`[test:seed] created auth user ${email} (password: ${DEFAULT_PASSWORD})`)
  return userId
}

// ─────────────────────────────────────────────────────────────────────────────
// primitives
// ─────────────────────────────────────────────────────────────────────────────

async function ensureContractor(opts: {
  id: string
  companyName: string
  bio: string
  yearsInBusiness: number
  verified: boolean
  avgRating: string | null
  totalReviews: number
  creditBalance?: number
  profileScore?: number
}): Promise<string> {
  await db
    .insert(contractors)
    .values({
      id: opts.id,
      companyName: opts.companyName,
      bio: opts.bio,
      logoUrl: logo(opts.companyName),
      yearsInBusiness: opts.yearsInBusiness,
      verificationStatus: opts.verified ? 'verified' : 'pending',
      creditBalance: opts.creditBalance ?? 50,
      profileScore: opts.profileScore ?? 80,
      avgRating: opts.avgRating,
      totalReviews: opts.totalReviews,
      avgResponseTimeMinutes: 120,
    })
    .onConflictDoUpdate({
      target: contractors.id,
      set: {
        companyName: opts.companyName,
        bio: opts.bio,
        yearsInBusiness: opts.yearsInBusiness,
        verificationStatus: opts.verified ? 'verified' : 'pending',
        avgRating: opts.avgRating,
        totalReviews: opts.totalReviews,
        creditBalance: opts.creditBalance ?? 50,
        profileScore: opts.profileScore ?? 80,
      },
    })
  return opts.id
}

async function ensureLead(opts: {
  key: string
  homeownerId: string
  serviceId: string
  subtype: string
  urgency: Urgency
  status: LeadStatus
  notes: string
  createdAt: Date
  awardedTo?: string | null
}): Promise<string> {
  const id = uid(`lead:${opts.key}`)
  await db
    .insert(leads)
    .values({
      id,
      homeownerId: opts.homeownerId,
      serviceId: opts.serviceId,
      serviceDetails: { subtypes: [opts.subtype] },
      urgency: opts.urgency,
      address: '4521 Maple Ave',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75219',
      lat: 32.8121,
      lng: -96.8005,
      notes: opts.notes,
      status: opts.status,
      engagementCreditCost: 5,
      awardedTo: opts.awardedTo ?? null,
      awardedAt: opts.awardedTo ? daysAgo(2) : null,
      createdAt: opts.createdAt,
    })
    .onConflictDoUpdate({
      target: leads.id,
      set: { status: opts.status, notes: opts.notes, awardedTo: opts.awardedTo ?? null },
    })
  return id
}

async function offer(
  leadId: string,
  contractorId: string,
  status: RecipientStatus,
  opts: { viewedAt?: Date; engagedAt?: Date } = {},
): Promise<void> {
  await db
    .insert(leadRecipients)
    .values({
      id: uid(`lr:${leadId}:${contractorId}`),
      leadId,
      contractorId,
      status,
      viewedAt: opts.viewedAt ?? null,
      engagedAt: opts.engagedAt ?? null,
      respondedAt: opts.engagedAt ?? null,
      offeredAt: daysAgo(3),
    })
    .onConflictDoUpdate({
      target: [leadRecipients.leadId, leadRecipients.contractorId],
      set: { status, viewedAt: opts.viewedAt ?? null, engagedAt: opts.engagedAt ?? null },
    })
}

async function ensureContact(contractorId: string, homeownerId: string): Promise<string> {
  const id = uid(`contact:${contractorId}:${homeownerId}`)
  await db
    .insert(contacts)
    .values({ id, contractorId, homeownerId, tags: [] })
    .onConflictDoUpdate({ target: [contacts.contractorId, contacts.homeownerId], set: { tags: [] } })
  return id
}

async function ensureProject(
  key: string,
  contractorId: string,
  contactId: string,
  leadId: string,
  serviceId: string,
  stage: ProjectStage,
): Promise<string> {
  const id = uid(`proj:${key}`)
  await db
    .insert(projects)
    .values({ id, contractorId, contactId, leadId, serviceId, stage, stageUpdatedAt: daysAgo(1) })
    .onConflictDoUpdate({ target: projects.id, set: { stage, stageUpdatedAt: daysAgo(1) } })
  return id
}

async function ensureConversation(projectId: string, homeownerUserId: string, contractorId: string): Promise<string> {
  const id = uid(`conv:${projectId}`)
  await db
    .insert(conversations)
    .values({ id, type: 'lead', contextType: 'project', contextId: projectId })
    .onConflictDoUpdate({ target: conversations.id, set: { contextType: 'project', contextId: projectId } })
  await db
    .insert(conversationParticipants)
    .values([
      { id: uid(`cp:${id}:ho`), conversationId: id, participantType: 'user', participantId: homeownerUserId },
      { id: uid(`cp:${id}:co`), conversationId: id, participantType: 'contractor', participantId: contractorId },
    ])
    .onConflictDoNothing({
      target: [
        conversationParticipants.conversationId,
        conversationParticipants.participantType,
        conversationParticipants.participantId,
      ],
    })
  return id
}

async function addMessage(
  key: string,
  conversationId: string,
  senderType: 'user' | 'contractor' | 'system',
  senderId: string | null,
  body: string,
  createdAt: Date,
  meta?: MessageMeta,
): Promise<void> {
  await db
    .insert(messages)
    .values({ id: uid(`msg:${key}`), conversationId, senderType, senderId, body, channel: 'platform', meta: meta ?? null, createdAt })
    .onConflictDoUpdate({ target: messages.id, set: { body, meta: meta ?? null } })
}

async function addEstimate(
  key: string,
  projectId: string,
  total: string,
  status: EstStatus,
  opts: { acceptedAt?: Date } = {},
): Promise<string> {
  const id = uid(`est:${key}`)
  const subtotal = total
  await db
    .insert(estimates)
    .values({
      id,
      projectId,
      serviceDetails: {},
      lineItems: [
        { label: 'Tear-off & disposal', amount: '1800.00' },
        { label: 'Architectural shingles + underlayment', amount: (parseFloat(total) - 2400).toFixed(2) },
        { label: 'Flashing & cleanup', amount: '600.00' },
      ],
      subtotal,
      taxAmount: '0.00',
      total,
      scopeNotes: 'Includes a 25-year workmanship warranty. Crew on site 2–3 days, full cleanup included.',
      status,
      acceptToken: randomBytes(24).toString('base64url'),
      sentAt: daysAgo(2),
      acceptedAt: opts.acceptedAt ?? null,
      validUntil: new Date(now + 30 * 86_400_000),
    })
    .onConflictDoUpdate({ target: estimates.id, set: { status, total, acceptedAt: opts.acceptedAt ?? null } })
  return id
}

async function addReview(
  projectId: string,
  contractorId: string,
  homeownerId: string,
  rating: number,
  comment: string,
): Promise<void> {
  await db
    .insert(reviews)
    .values({
      id: uid(`rev:${projectId}`),
      projectId,
      contractorId,
      reviewerType: 'homeowner',
      reviewerId: homeownerId,
      rating,
      comment,
      token: randomBytes(24).toString('base64url'),
      submittedAt: daysAgo(1),
    })
    .onConflictDoUpdate({ target: reviews.id, set: { rating, comment, submittedAt: daysAgo(1) } })
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[test:seed] DATABASE_URL is not set.')
    process.exit(1)
  }

  const [service] = await db.select({ id: services.id }).from(services).where(eq(services.slug, 'roofing')).limit(1)
  if (!service) {
    console.error('[test:seed] No roofing service found. Run `pnpm db:seed` first (reference data).')
    process.exit(1)
  }
  const serviceId = service.id

  // Accounts.
  const homeownerUserId = await ensureUser(HOMEOWNER_EMAIL, 'homeowner', 'Haseeb (Homeowner)')
  const contractorUserId = await ensureUser(CONTRACTOR_EMAIL, 'contractor', 'Haseeb (Contractor)')

  // Homeowner profile — reuse the row from real signup if present (user_id is
  // unique), else create one. Don't blind-insert: it collides on homeowners_user_uq.
  const [existingHo] = await db
    .select({ id: homeowners.id })
    .from(homeowners)
    .where(eq(homeowners.userId, homeownerUserId))
    .limit(1)
  let HO: string
  if (existingHo) {
    HO = existingHo.id
  } else {
    const [createdHo] = await db
      .insert(homeowners)
      .values({ id: uid(`ho:${homeownerUserId}`), userId: homeownerUserId })
      .returning({ id: homeowners.id })
    HO = createdHo.id
  }

  // "Your" company (the contractor logs in as this). Reuse their existing
  // membership's company if they have one, else create one.
  const [membership] = await db
    .select({ contractorId: contractorMembers.contractorId })
    .from(contractorMembers)
    .where(and(eq(contractorMembers.userId, contractorUserId), eq(contractorMembers.status, 'active')))
    .limit(1)
  const MINE = membership?.contractorId ?? uid('co:mine')
  await ensureContractor({
    id: MINE,
    companyName: 'Lone Star Roofing Co.',
    bio: 'Family-owned roofing contractor serving the Dallas metro since 2014. Licensed, insured, clean tear-offs and on-time crews.',
    yearsInBusiness: 11,
    verified: true,
    avgRating: '4.60',
    totalReviews: 15,
    creditBalance: 300,
    profileScore: 95,
  })
  await db
    .insert(contractorMembers)
    .values({ id: uid(`cm:${MINE}:${contractorUserId}`), contractorId: MINE, userId: contractorUserId, role: 'owner', status: 'active' })
    .onConflictDoUpdate({ target: [contractorMembers.contractorId, contractorMembers.userId], set: { role: 'owner', status: 'active' } })
  // Make sure the contractor resolves to this company on login.
  await db.update(users).set({ activeContractorId: MINE }).where(eq(users.id, contractorUserId))

  // Competitor companies (no logins) — for "multiple interested contractors".
  const SUMMIT = await ensureContractor({
    id: uid('co:summit'),
    companyName: 'Summit Exteriors',
    bio: 'Storm-damage specialists who handle the insurance paperwork for you. North Dallas.',
    yearsInBusiness: 12,
    verified: true,
    avgRating: '4.80',
    totalReviews: 27,
  })
  const APEX = await ensureContractor({
    id: uid('co:apex'),
    companyName: 'Apex Roofing',
    bio: 'Fast, affordable repairs and replacements across DFW.',
    yearsInBusiness: 6,
    verified: true,
    avgRating: '4.20',
    totalReviews: 9,
  })
  const FRESHTOP = await ensureContractor({
    id: uid('co:freshtop'),
    companyName: 'FreshTop Roofers',
    bio: 'New to Hommy — established local crew, eager to earn your review.',
    yearsInBusiness: 1,
    verified: true,
    avgRating: null,
    totalReviews: 0,
  })

  const COMPANY_NAME: Record<string, string> = {
    [MINE]: 'Lone Star Roofing Co.',
    [SUMMIT]: 'Summit Exteriors',
    [APEX]: 'Apex Roofing',
    [FRESHTOP]: 'FreshTop Roofers',
  }

  /** Engage a contractor on a lead: contact + project + conversation + intro chat. */
  async function engage(
    key: string,
    leadId: string,
    contractorId: string,
    stage: ProjectStage,
    recipientStatus: RecipientStatus,
  ): Promise<{ projectId: string; conversationId: string }> {
    await offer(leadId, contractorId, recipientStatus, { engagedAt: daysAgo(2), viewedAt: daysAgo(3) })
    const contactId = await ensureContact(contractorId, HO)
    const projectId = await ensureProject(key, contractorId, contactId, leadId, serviceId, stage)
    const conversationId = await ensureConversation(projectId, homeownerUserId, contractorId)
    await addMessage(`${key}:m1`, conversationId, 'contractor', contractorId, `Hi! Thanks for the request — we'd love to help with this. Could we come take a look this week?`, minsAgo(180))
    await addMessage(`${key}:m2`, conversationId, 'user', homeownerUserId, `Yes please, afternoons work best for me.`, minsAgo(120))
    return { projectId, conversationId }
  }

  console.log('[test:seed] building scenarios…')

  // L1 — POSTED: offered to 3 pros, no views, no engagement.
  {
    const leadId = await ensureLead({ key: 'posted', homeownerId: HO, serviceId, subtype: 'Repair', urgency: 'within_month', status: 'open', notes: 'Small leak near the chimney after last week’s rain.', createdAt: minsAgo(30) })
    await offer(leadId, MINE, 'offered')
    await offer(leadId, SUMMIT, 'offered')
    await offer(leadId, APEX, 'offered')
  }

  // L2 — VIEWED: a couple of pros opened it, none engaged.
  {
    const leadId = await ensureLead({ key: 'viewed', homeownerId: HO, serviceId, subtype: 'Inspection', urgency: 'within_week', status: 'open', notes: 'Want a roof inspection before listing the house.', createdAt: daysAgo(1) })
    await offer(leadId, MINE, 'viewed', { viewedAt: minsAgo(90) })
    await offer(leadId, SUMMIT, 'viewed', { viewedAt: minsAgo(200) })
    await offer(leadId, FRESHTOP, 'offered')
  }

  // L3 — INTERESTED (talking): 2 pros engaged, chatting, no quotes yet.
  {
    const leadId = await ensureLead({ key: 'interested', homeownerId: HO, serviceId, subtype: 'Replacement', urgency: 'within_month', status: 'open', notes: 'Roof is ~20 years old, want to replace before winter.', createdAt: daysAgo(2) })
    await engage('interested:mine', leadId, MINE, 'new_lead', 'engaged')
    await engage('interested:summit', leadId, SUMMIT, 'new_lead', 'engaged')
    await offer(leadId, APEX, 'offered')
  }

  // L4 — QUOTES: 3 pros engaged + sent quotes (compare + accept).
  {
    const leadId = await ensureLead({ key: 'quotes', homeownerId: HO, serviceId, subtype: 'Replacement', urgency: 'planning', status: 'open', notes: 'Full replacement, architectural shingles preferred.', createdAt: daysAgo(3) })
    for (const [k, cid, total] of [
      ['quotes:mine', MINE, '14250.00'],
      ['quotes:summit', SUMMIT, '16400.00'],
      ['quotes:apex', APEX, '12900.00'],
    ] as const) {
      const { projectId, conversationId } = await engage(k, leadId, cid, 'estimate_sent', 'engaged')
      const estId = await addEstimate(k, projectId, total, 'sent')
      await addMessage(`${k}:quote`, conversationId, 'system', null, `Quote sent — $${total}`, minsAgo(60), {
        kind: 'quote',
        estimateId: estId,
        total,
        status: 'sent',
      })
    }
  }

  // L5 — HIRED / WON (your company wins): accepted quote; a competitor lost.
  {
    const leadId = await ensureLead({ key: 'won', homeownerId: HO, serviceId, subtype: 'Storm Damage', urgency: 'emergency', status: 'awarded', notes: 'Wind tore shingles off the north side after the storm.', createdAt: daysAgo(5), awardedTo: MINE })
    const win = await engage('won:mine', leadId, MINE, 'in_progress', 'won')
    const estId = await addEstimate('won:mine', win.projectId, '15800.00', 'accepted', { acceptedAt: daysAgo(2) })
    await addMessage('won:mine:quote', win.conversationId, 'system', null, 'Quote sent — $15800.00', daysAgo(2), {
      kind: 'quote',
      estimateId: estId,
      total: '15800.00',
      status: 'accepted',
    })
    await addMessage('won:mine:accepted', win.conversationId, 'system', null, 'Quote accepted.', minsAgo(50), {
      kind: 'event',
      event: 'quote_accepted',
      actorType: 'user',
      actorId: homeownerUserId,
    })
    // A competitor engaged + quoted but lost.
    const lose = await engage('won:summit', leadId, SUMMIT, 'lost', 'lost')
    await addEstimate('won:summit', lose.projectId, '17200.00', 'rejected')
  }

  // L6 — DONE, awaiting review: your company completed it, no review yet.
  {
    const leadId = await ensureLead({ key: 'done', homeownerId: HO, serviceId, subtype: 'Repair', urgency: 'within_month', status: 'awarded', notes: 'Replace damaged vent boots and reseal.', createdAt: daysAgo(10), awardedTo: MINE })
    const job = await engage('done:mine', leadId, MINE, 'completed', 'won')
    const estId = await addEstimate('done:mine', job.projectId, '3200.00', 'accepted', { acceptedAt: daysAgo(6) })
    await addMessage('done:mine:quote', job.conversationId, 'system', null, 'Quote sent — $3200.00', daysAgo(6), { kind: 'quote', estimateId: estId, total: '3200.00', status: 'accepted' })
    await addMessage('done:mine:completed', job.conversationId, 'system', null, 'Job marked completed.', daysAgo(1), { kind: 'event', event: 'job_completed', actorType: 'contractor', actorId: MINE })
    await addMessage('done:mine:review', job.conversationId, 'system', null, 'How was the job? Leave a review.', minsAgo(30), { kind: 'review', projectId: job.projectId, contractorId: MINE, status: 'pending' })
  }

  // L7 — DONE + REVIEWED: completed and 5-star reviewed.
  {
    const leadId = await ensureLead({ key: 'reviewed', homeownerId: HO, serviceId, subtype: 'Replacement', urgency: 'planning', status: 'awarded', notes: 'Full re-roof, completed last month.', createdAt: daysAgo(40), awardedTo: MINE })
    const job = await engage('reviewed:mine', leadId, MINE, 'completed', 'won')
    const estId = await addEstimate('reviewed:mine', job.projectId, '13900.00', 'accepted', { acceptedAt: daysAgo(30) })
    await addMessage('reviewed:mine:quote', job.conversationId, 'system', null, 'Quote sent — $13900.00', daysAgo(30), { kind: 'quote', estimateId: estId, total: '13900.00', status: 'accepted' })
    await addMessage('reviewed:mine:completed', job.conversationId, 'system', null, 'Job marked completed.', daysAgo(3), { kind: 'event', event: 'job_completed', actorType: 'contractor', actorId: MINE })
    await addMessage('reviewed:mine:review', job.conversationId, 'system', null, 'How was the job? Leave a review.', daysAgo(2), { kind: 'review', projectId: job.projectId, contractorId: MINE, status: 'submitted', rating: 5 })
    await addReview(job.projectId, MINE, HO, 5, 'Crew was on time, cleaned up everything, and the roof looks fantastic. Would hire again.')
  }

  // L8 — LOST (for the contractor): a competitor won; your company engaged + lost.
  {
    const leadId = await ensureLead({ key: 'lost', homeownerId: HO, serviceId, subtype: 'Replacement', urgency: 'within_week', status: 'awarded', notes: 'Hail damage replacement — went with another pro.', createdAt: daysAgo(7), awardedTo: SUMMIT })
    await engage('lost:mine', leadId, MINE, 'lost', 'lost')
    const win = await engage('lost:summit', leadId, SUMMIT, 'in_progress', 'won')
    const estId = await addEstimate('lost:summit', win.projectId, '14100.00', 'accepted', { acceptedAt: daysAgo(3) })
    await addMessage('lost:summit:quote', win.conversationId, 'system', null, 'Quote sent — $14100.00', daysAgo(3), { kind: 'quote', estimateId: estId, total: '14100.00', status: 'accepted' })
  }

  console.log('[test:seed] done. Scenarios seeded:')
  console.log(`  Homeowner (${HOMEOWNER_EMAIL}) → Jobs board: posted, viewed, interested, quotes, hired, done, done+reviewed`)
  console.log(`  Contractor (${CONTRACTOR_EMAIL}, ${COMPANY_NAME[MINE]}) → Jobs board: new, viewed(new), talking, quoted, won, done×2, lost`)
  console.log(`  Competitors: Summit Exteriors, Apex Roofing, FreshTop Roofers (interested on multiple jobs)`)
  if (supabase) console.log(`  Logins (if just created): password = ${DEFAULT_PASSWORD}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[test:seed] failed', err)
  process.exit(1)
})
