import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadRecipients, scoreEvents } from '@/lib/db/schema'
import {
  makeContractorService,
  makeContractorWithOwner,
  makeHomeowner,
  makeLead,
  makeLeadRecipient,
  makeServiceArea,
  seedRoofingService,
} from '../fixtures'
import { mockAuth, signInAs, signOut } from '../helpers/auth'
import { capturingInngest, getCapturedInngestEvents, resetCapturedInngestEvents } from '../helpers/inngest'
import { mockNextCache } from '../helpers/next'

/**
 * Declining a lead offer (docs §4.1 step 6 / §4.3): the recipient flips to
 * `declined`, the company's score decays (gently with a reason, more without),
 * and the lead cascades to ONE more eligible company if any remain — which is
 * what re-emits `lead/created`.
 */

vi.mock('@/lib/auth/session', () => mockAuth())
vi.mock('next/cache', () => mockNextCache())
vi.mock('@/lib/inngest/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/inngest/client')>()),
  inngest: capturingInngest,
}))

import { declineLead } from '@/lib/actions/decline-lead'

async function recipientStatus(leadId: string, contractorId: string) {
  const [r] = await db
    .select()
    .from(leadRecipients)
    .where(and(eq(leadRecipients.leadId, leadId), eq(leadRecipients.contractorId, contractorId)))
  return r
}

async function scoreDelta(contractorId: string, kind: string): Promise<number> {
  const rows = await db
    .select({ delta: scoreEvents.delta })
    .from(scoreEvents)
    .where(and(eq(scoreEvents.contractorId, contractorId), eq(scoreEvents.kind, kind as never)))
  return rows.reduce((s, r) => s + r.delta, 0)
}

describe('declineLead', () => {
  beforeAll(() => {
    if (!process.env.DATABASE_URL?.includes('localhost')) {
      throw new Error('Integration tests must point at the localhost test DB (.env.test).')
    }
  })
  beforeEach(() => {
    resetCapturedInngestEvents()
    signOut()
  })
  afterEach(() => signOut())

  it('declining WITH a reason is neutral (0) and records the reason', async () => {
    const serviceId = await seedRoofingService()
    const ho = await makeHomeowner()
    const c = await makeContractorWithOwner({ contractor: { profileScore: 50 } })
    await makeContractorService(c.contractorId, serviceId)
    await makeServiceArea(c.contractorId)
    const lead = await makeLead(ho.homeownerId, serviceId)
    await makeLeadRecipient(lead, c.contractorId)

    signInAs({ id: c.userId, email: c.email, role: 'contractor' })
    const res = await declineLead(lead, 'Booked solid this month')
    expect(res.ok).toBe(true)

    const rec = await recipientStatus(lead, c.contractorId)
    expect(rec.status).toBe('declined')
    expect(rec.declineReason).toBe('Booked solid this month')
    expect(await scoreDelta(c.contractorId, 'lead_ignored_with_reason')).toBe(0)
  })

  it('declining with NO reason applies the gentle ding (-3)', async () => {
    const serviceId = await seedRoofingService()
    const ho = await makeHomeowner()
    const c = await makeContractorWithOwner({ contractor: { profileScore: 50 } })
    await makeContractorService(c.contractorId, serviceId)
    await makeServiceArea(c.contractorId)
    const lead = await makeLead(ho.homeownerId, serviceId)
    await makeLeadRecipient(lead, c.contractorId)

    signInAs({ id: c.userId, email: c.email, role: 'contractor' })
    const res = await declineLead(lead)
    expect(res.ok).toBe(true)

    expect((await recipientStatus(lead, c.contractorId)).status).toBe('declined')
    expect(await scoreDelta(c.contractorId, 'lead_ignored_no_reason')).toBe(-3)
  })

  it('cascades to the next eligible company and re-emits lead/created', async () => {
    const serviceId = await seedRoofingService()
    const ho = await makeHomeowner()
    const decliner = await makeContractorWithOwner({})
    const next = await makeContractorWithOwner({})
    for (const c of [decliner, next]) {
      await makeContractorService(c.contractorId, serviceId)
      await makeServiceArea(c.contractorId)
    }
    const lead = await makeLead(ho.homeownerId, serviceId)
    // Only the decliner has been offered so far; `next` is eligible but unoffered.
    await makeLeadRecipient(lead, decliner.contractorId)

    signInAs({ id: decliner.userId, email: decliner.email, role: 'contractor' })
    const res = await declineLead(lead, 'Not my area')
    expect(res.ok).toBe(true)

    // The next company now has an offer row…
    const nextRec = await recipientStatus(lead, next.contractorId)
    expect(nextRec?.status).toBe('offered')
    // …and the cascade fired a fresh lead/created.
    expect(getCapturedInngestEvents().byName('lead/created')).toHaveLength(1)
  })

  it('does NOT cascade (no lead/created) when no fresh company remains', async () => {
    const serviceId = await seedRoofingService()
    const ho = await makeHomeowner()
    const only = await makeContractorWithOwner({})
    await makeContractorService(only.contractorId, serviceId)
    await makeServiceArea(only.contractorId)
    const lead = await makeLead(ho.homeownerId, serviceId)
    await makeLeadRecipient(lead, only.contractorId)

    signInAs({ id: only.userId, email: only.email, role: 'contractor' })
    const res = await declineLead(lead, 'Pass')
    expect(res.ok).toBe(true)
    expect(getCapturedInngestEvents().byName('lead/created')).toHaveLength(0)
  })

  it('refuses to decline a lead not offered to the company (NOT_OFFERED)', async () => {
    const serviceId = await seedRoofingService()
    const ho = await makeHomeowner()
    const c = await makeContractorWithOwner({})
    const lead = await makeLead(ho.homeownerId, serviceId)
    // No recipient row for this company.

    signInAs({ id: c.userId, email: c.email, role: 'contractor' })
    expect(await declineLead(lead, 'nope')).toMatchObject({ ok: false, error: 'NOT_OFFERED' })
  })
})
