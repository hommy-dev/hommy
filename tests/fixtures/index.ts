/**
 * Drizzle insert factories for integration tests. Each returns the new row's id
 * (or the row) so tests stay terse. Sensible defaults: a contractor is verified
 * with credits, a lead is open + offered. Override per test as needed.
 *
 * All inserts go through the privileged `db` (RLS bypassed in tests); the
 * afterEach TRUNCATE in tests/setup-integration.ts resets between tests.
 */

import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import {
  contacts,
  contractors,
  contractorMembers,
  contractorServices,
  conversationParticipants,
  conversations,
  estimates,
  homeowners,
  leadRecipients,
  leads,
  projects,
  serviceAreas,
  services,
  users,
} from '@/lib/db/schema'

const DALLAS = { lat: 32.7767, lng: -96.797 }

export async function seedRoofingService(
  overrides: Partial<typeof services.$inferInsert> = {},
): Promise<string> {
  const [s] = await db
    .insert(services)
    .values({ slug: 'roofing', name: 'Roofing', subtypes: ['Repair', 'Replacement'], ...overrides })
    .returning({ id: services.id })
  return s.id
}

export async function makeUser(
  overrides: Partial<typeof users.$inferInsert> = {},
): Promise<{ id: string; email: string; role: 'contractor' | 'homeowner' | 'admin' }> {
  const id = overrides.id ?? randomUUID()
  const email = overrides.email ?? `user-${id.slice(0, 8)}@test.dev`
  const role = overrides.role ?? 'contractor'
  await db.insert(users).values({ id, email, role, fullName: 'Test User', passwordSet: true, ...overrides })
  return { id, email, role }
}

export async function makeContractor(
  overrides: Partial<typeof contractors.$inferInsert> = {},
): Promise<string> {
  const [c] = await db
    .insert(contractors)
    .values({
      companyName: 'Test Roofing Co.',
      verificationStatus: 'verified',
      creditBalance: 100,
      profileScore: 50,
      ...overrides,
    })
    .returning({ id: contractors.id })
  return c.id
}

export async function makeMembership(
  contractorId: string,
  userId: string,
  overrides: Partial<typeof contractorMembers.$inferInsert> = {},
): Promise<string> {
  const [m] = await db
    .insert(contractorMembers)
    .values({ contractorId, userId, role: 'owner', status: 'active', ...overrides })
    .returning({ id: contractorMembers.id })
  return m.id
}

/** A verified contractor company + an owner user + membership, in one call. */
export async function makeContractorWithOwner(opts?: {
  contractor?: Partial<typeof contractors.$inferInsert>
  user?: Partial<typeof users.$inferInsert>
}): Promise<{ contractorId: string; userId: string; email: string }> {
  const user = await makeUser({ role: 'contractor', ...opts?.user })
  const contractorId = await makeContractor(opts?.contractor)
  await makeMembership(contractorId, user.id)
  return { contractorId, userId: user.id, email: user.email }
}

export async function makeHomeowner(opts?: {
  user?: Partial<typeof users.$inferInsert>
}): Promise<{ homeownerId: string; userId: string; email: string }> {
  const user = await makeUser({ role: 'homeowner', ...opts?.user })
  const [h] = await db.insert(homeowners).values({ userId: user.id }).returning({ id: homeowners.id })
  return { homeownerId: h.id, userId: user.id, email: user.email }
}

export async function makeServiceArea(
  contractorId: string,
  overrides: Partial<typeof serviceAreas.$inferInsert> = {},
): Promise<string> {
  const [a] = await db
    .insert(serviceAreas)
    .values({
      contractorId,
      label: 'Coverage area',
      areaType: 'circle',
      lat: DALLAS.lat,
      lng: DALLAS.lng,
      radiusKm: 80,
      ...overrides,
    })
    .returning({ id: serviceAreas.id })
  return a.id
}

export async function makeContractorService(
  contractorId: string,
  serviceId: string,
  subtypes: string[] = ['Repair'],
): Promise<void> {
  await db.insert(contractorServices).values({ contractorId, serviceId, subtypes })
}

export async function makeLead(
  homeownerId: string,
  serviceId: string,
  overrides: Partial<typeof leads.$inferInsert> = {},
): Promise<string> {
  const [l] = await db
    .insert(leads)
    .values({
      homeownerId,
      serviceId,
      urgency: 'within_month',
      status: 'open',
      engagementCreditCost: 5,
      lat: DALLAS.lat,
      lng: DALLAS.lng,
      city: 'Dallas',
      state: 'TX',
      ...overrides,
    })
    .returning({ id: leads.id })
  return l.id
}

export async function makeLeadRecipient(
  leadId: string,
  contractorId: string,
  overrides: Partial<typeof leadRecipients.$inferInsert> = {},
): Promise<string> {
  const [r] = await db
    .insert(leadRecipients)
    .values({ leadId, contractorId, status: 'offered', ...overrides })
    .returning({ id: leadRecipients.id })
  return r.id
}

export async function makeContact(
  contractorId: string,
  homeownerId: string,
  overrides: Partial<typeof contacts.$inferInsert> = {},
): Promise<string> {
  const [c] = await db
    .insert(contacts)
    .values({ contractorId, homeownerId, ...overrides })
    .returning({ id: contacts.id })
  return c.id
}

export async function makeProject(
  contractorId: string,
  contactId: string,
  serviceId: string,
  overrides: Partial<typeof projects.$inferInsert> = {},
): Promise<string> {
  const [p] = await db
    .insert(projects)
    .values({ contractorId, contactId, serviceId, stage: 'new_lead', ...overrides })
    .returning({ id: projects.id })
  return p.id
}

export async function makeEstimate(
  projectId: string,
  overrides: Partial<typeof estimates.$inferInsert> = {},
): Promise<string> {
  const [e] = await db
    .insert(estimates)
    .values({ projectId, status: 'draft', total: '1000.00', subtotal: '1000.00', ...overrides })
    .returning({ id: estimates.id })
  return e.id
}

export async function makeConversation(
  overrides: Partial<typeof conversations.$inferInsert> = {},
): Promise<string> {
  const [c] = await db
    .insert(conversations)
    .values({ type: 'lead', ...overrides })
    .returning({ id: conversations.id })
  return c.id
}

export async function addParticipant(
  conversationId: string,
  participantType: 'user' | 'contractor',
  participantId: string,
): Promise<void> {
  await db
    .insert(conversationParticipants)
    .values({ conversationId, participantType, participantId })
}
