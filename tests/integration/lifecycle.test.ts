import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  activityLog,
  contractors,
  conversations,
  estimates,
  leadRecipients,
  leads,
  notifications,
  projects,
  reviews,
  scoreEvents,
} from '@/lib/db/schema'
import {
  makeContractorWithOwner,
  makeContractorService,
  makeHomeowner,
  makeLead,
  makeLeadRecipient,
  makeServiceArea,
  seedRoofingService,
} from '../fixtures'
import { mockAuth, signInAs, signOut } from '../helpers/auth'
import { capturingInngest, getCapturedInngestEvents, resetCapturedInngestEvents } from '../helpers/inngest'
import { mockRealtimeBroadcast, resetBroadcasts } from '../helpers/realtime'
import { mockNextCache, mockNextHeaders } from '../helpers/next'
import { mockEmail, mockPush, mockSms } from '../helpers/notifications'

/**
 * The golden path — one lead carried end to end through the real server actions
 * against the test DB: engage → quote → accept (win) → complete → review. We
 * assert the post-condition rows AND the captured Inngest events at every step.
 *
 * Only the request-scoped runtime is mocked (auth, next/cache, next/headers, the
 * realtime transport, the Inngest client). Everything else — credits, scoring,
 * messaging rows, notifications — runs for real and is asserted in the DB.
 */

vi.mock('@/lib/auth/session', () => mockAuth())
vi.mock('next/cache', () => mockNextCache())
vi.mock('next/headers', () => mockNextHeaders())
vi.mock('@/lib/realtime/broadcast', () => mockRealtimeBroadcast())
// The low-level senders construct Resend/Plivo/web-push at import time and throw
// without keys. Mock the three modules (sendNotification itself still runs, so
// the in-app `notifications` row is written for real and asserted below).
vi.mock('@/lib/notifications/email', () => mockEmail())
vi.mock('@/lib/notifications/sms', () => mockSms())
vi.mock('@/lib/notifications/push', () => mockPush())
vi.mock('@/lib/inngest/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/inngest/client')>()),
  inngest: capturingInngest,
}))

import { engageLead } from '@/lib/actions/engage'
import { sendEstimate } from '@/lib/actions/estimates'
import { acceptEstimate, acceptEstimateByToken } from '@/lib/actions/accept-estimate'
import { advanceProjectStage } from '@/lib/actions/projects'
import { submitProjectReview } from '@/lib/actions/reviews'

const SLINE = [{ label: 'Tear-off and re-shingle', amount: 9000 }]

async function scoreDeltaFor(contractorId: string, kind: string): Promise<number> {
  const rows = await db
    .select({ delta: scoreEvents.delta })
    .from(scoreEvents)
    .where(and(eq(scoreEvents.contractorId, contractorId), eq(scoreEvents.kind, kind as never)))
  return rows.reduce((s, r) => s + r.delta, 0)
}

async function profileScore(contractorId: string): Promise<number> {
  const [c] = await db.select({ s: contractors.profileScore }).from(contractors).where(eq(contractors.id, contractorId))
  return c.s
}

describe('lead lifecycle (golden path)', () => {
  beforeAll(() => {
    if (!process.env.DATABASE_URL?.includes('localhost')) {
      throw new Error('Integration tests must point at the localhost test DB (.env.test).')
    }
  })

  beforeEach(() => {
    resetCapturedInngestEvents()
    resetBroadcasts()
    signOut()
  })
  afterEach(() => signOut())

  it('engage → quote → accept → complete → review end to end', async () => {
    const serviceId = await seedRoofingService()
    const ho = await makeHomeowner()
    const winner = await makeContractorWithOwner({ contractor: { creditBalance: 100, profileScore: 50 } })
    await makeContractorService(winner.contractorId, serviceId)
    await makeServiceArea(winner.contractorId)
    const lead = await makeLead(ho.homeownerId, serviceId, { engagementCreditCost: 5 })
    await makeLeadRecipient(lead, winner.contractorId, { status: 'offered' })

    // ── ENGAGE ──────────────────────────────────────────────
    signInAs({ id: winner.userId, email: winner.email, role: 'contractor' })
    const engaged = await engageLead(lead)
    expect(engaged.ok).toBe(true)
    if (!engaged.ok) return

    expect(engaged.creditsSpent).toBe(5)
    expect(engaged.balanceAfter).toBe(95)
    const [recAfterEngage] = await db
      .select()
      .from(leadRecipients)
      .where(and(eq(leadRecipients.leadId, lead), eq(leadRecipients.contractorId, winner.contractorId)))
    expect(recAfterEngage.status).toBe('engaged')
    expect(recAfterEngage.slaDeadline).not.toBeNull()

    const [project] = await db.select().from(projects).where(eq(projects.id, engaged.projectId))
    expect(project.stage).toBe('new_lead')
    expect(project.contractorId).toBe(winner.contractorId)

    const [convo] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.contextType, 'project'), eq(conversations.contextId, engaged.projectId)))
    expect(convo).toBeTruthy()

    // within_month offered just now → fast engage (+5).
    expect(await scoreDeltaFor(winner.contractorId, 'fast_engagement')).toBe(5)
    expect(await profileScore(winner.contractorId)).toBe(55)
    expect(getCapturedInngestEvents().byName('lead/engaged')).toHaveLength(1)

    // ── QUOTE (sendEstimate) ────────────────────────────────
    const sent = await sendEstimate({
      projectId: engaged.projectId,
      lineItems: SLINE,
      taxRatePct: 0,
      validDays: 30,
    })
    expect(sent.ok).toBe(true)
    if (!sent.ok) return

    const [estimate] = await db.select().from(estimates).where(eq(estimates.id, sent.estimateId))
    expect(estimate.status).toBe('sent')
    expect(estimate.acceptToken).toBeTruthy()
    expect(estimate.total).toBe('9000.00')
    const [projAfterQuote] = await db.select().from(projects).where(eq(projects.id, engaged.projectId))
    expect(projAfterQuote.stage).toBe('estimate_sent')
    expect(getCapturedInngestEvents().byName('quote/submitted')).toHaveLength(1)

    // ── ACCEPT (homeowner wins it for the contractor) ───────
    signInAs({ id: ho.userId, email: ho.email, role: 'homeowner' })
    const accepted = await acceptEstimate(sent.estimateId)
    expect(accepted.ok).toBe(true)
    if (!accepted.ok) return

    // computeAwardCost(9000, 5): 2.5% = 225, clamp [40,250] → 225, less 5 engage = 220.
    const [winnerCo] = await db.select().from(contractors).where(eq(contractors.id, winner.contractorId))
    expect(winnerCo.creditBalance).toBe(95 - 220) // -125 (allowNegative)

    const [estAfter] = await db.select().from(estimates).where(eq(estimates.id, sent.estimateId))
    expect(estAfter.status).toBe('accepted')
    expect(estAfter.acceptedAt).not.toBeNull()
    expect(estAfter.acceptedSnapshot).toMatchObject({ total: '9000.00' })

    const [leadAfter] = await db.select().from(leads).where(eq(leads.id, lead))
    expect(leadAfter.status).toBe('awarded')
    expect(leadAfter.awardedTo).toBe(winner.contractorId)

    const [winnerRec] = await db
      .select()
      .from(leadRecipients)
      .where(and(eq(leadRecipients.leadId, lead), eq(leadRecipients.contractorId, winner.contractorId)))
    expect(winnerRec.status).toBe('won')

    const [winnerProject] = await db.select().from(projects).where(eq(projects.id, engaged.projectId))
    expect(winnerProject.stage).toBe('in_progress')

    expect(await scoreDeltaFor(winner.contractorId, 'quote_accepted')).toBe(15)
    expect(getCapturedInngestEvents().byName('quote/accepted')).toHaveLength(1)

    // ── COMPLETE ────────────────────────────────────────────
    signInAs({ id: winner.userId, email: winner.email, role: 'contractor' })
    const completed = await advanceProjectStage(engaged.projectId, 'completed')
    expect(completed.ok).toBe(true)

    const [projDone] = await db.select().from(projects).where(eq(projects.id, engaged.projectId))
    expect(projDone.stage).toBe('completed')
    const log = await db.select().from(activityLog).where(eq(activityLog.projectId, engaged.projectId))
    expect(log.some((l) => l.action === 'stage_changed')).toBe(true)
    // The homeowner got an in-app "job complete" notification.
    const notifs = await db.select().from(notifications).where(eq(notifications.userId, ho.userId))
    expect(notifs.some((n) => n.type === 'SYSTEM')).toBe(true)
    expect(getCapturedInngestEvents().byName('review/request.scheduled')).toHaveLength(1)

    // ── REVIEW ──────────────────────────────────────────────
    signInAs({ id: ho.userId, email: ho.email, role: 'homeowner' })
    const reviewed = await submitProjectReview({ projectId: engaged.projectId, rating: 5, comment: 'Great work' })
    expect(reviewed.ok).toBe(true)

    const [rev] = await db.select().from(reviews).where(eq(reviews.projectId, engaged.projectId))
    expect(rev.rating).toBe(5)
    expect(rev.submittedAt).not.toBeNull()
    const [coAfterReview] = await db.select().from(contractors).where(eq(contractors.id, winner.contractorId))
    expect(coAfterReview.avgRating).toBe('5.00')
    expect(coAfterReview.totalReviews).toBe(1)
    // 5★ → +8 review delta.
    expect(await scoreDeltaFor(winner.contractorId, 'review_received')).toBe(8)
    expect(getCapturedInngestEvents().byName('review/submitted')).toHaveLength(1)
  })

  it('accept marks OTHER engaged contractors + their projects lost', async () => {
    const serviceId = await seedRoofingService()
    const ho = await makeHomeowner()
    const winner = await makeContractorWithOwner({ contractor: { creditBalance: 100 } })
    const loser = await makeContractorWithOwner({ contractor: { creditBalance: 100 } })
    for (const c of [winner, loser]) {
      await makeContractorService(c.contractorId, serviceId)
      await makeServiceArea(c.contractorId)
    }
    const lead = await makeLead(ho.homeownerId, serviceId)
    await makeLeadRecipient(lead, winner.contractorId)
    await makeLeadRecipient(lead, loser.contractorId)

    signInAs({ id: loser.userId, email: loser.email, role: 'contractor' })
    const loserEngage = await engageLead(lead)
    expect(loserEngage.ok).toBe(true)

    signInAs({ id: winner.userId, email: winner.email, role: 'contractor' })
    const winnerEngage = await engageLead(lead)
    expect(winnerEngage.ok).toBe(true)
    if (!winnerEngage.ok) return

    const sent = await sendEstimate({ projectId: winnerEngage.projectId, lineItems: SLINE, validDays: 30 })
    expect(sent.ok).toBe(true)
    if (!sent.ok) return

    signInAs({ id: ho.userId, email: ho.email, role: 'homeowner' })
    const accepted = await acceptEstimate(sent.estimateId)
    expect(accepted.ok).toBe(true)

    const [loserRec] = await db
      .select()
      .from(leadRecipients)
      .where(and(eq(leadRecipients.leadId, lead), eq(leadRecipients.contractorId, loser.contractorId)))
    expect(loserRec.status).toBe('lost')

    const loserProjects = await db.select().from(projects).where(eq(projects.contractorId, loser.contractorId))
    expect(loserProjects).toHaveLength(1)
    expect(loserProjects[0].stage).toBe('lost')
  })

  it('accepts via the email token path and rejects a second accept (ALREADY_AWARDED)', async () => {
    const serviceId = await seedRoofingService()
    const ho = await makeHomeowner()
    const winner = await makeContractorWithOwner({ contractor: { creditBalance: 100 } })
    await makeContractorService(winner.contractorId, serviceId)
    await makeServiceArea(winner.contractorId)
    const lead = await makeLead(ho.homeownerId, serviceId)
    await makeLeadRecipient(lead, winner.contractorId)

    signInAs({ id: winner.userId, email: winner.email, role: 'contractor' })
    const engaged = await engageLead(lead)
    expect(engaged.ok).toBe(true)
    if (!engaged.ok) return
    const sent = await sendEstimate({ projectId: engaged.projectId, lineItems: SLINE, validDays: 30 })
    expect(sent.ok).toBe(true)
    if (!sent.ok) return

    const [estRow] = await db.select().from(estimates).where(eq(estimates.id, sent.estimateId))
    const token = estRow.acceptToken!

    // Token path needs no session.
    signOut()
    const accepted = await acceptEstimateByToken(token)
    expect(accepted.ok).toBe(true)

    // A second accept on the now-awarded lead is refused.
    const again = await acceptEstimateByToken(token)
    expect(again).toMatchObject({ ok: false, error: 'NOT_SENT' })
  })

  describe('engage guards', () => {
    it('refuses an unverified company (NOT_VERIFIED)', async () => {
      const serviceId = await seedRoofingService()
      const ho = await makeHomeowner()
      const c = await makeContractorWithOwner({ contractor: { verificationStatus: 'pending' } })
      await makeContractorService(c.contractorId, serviceId)
      await makeServiceArea(c.contractorId)
      const lead = await makeLead(ho.homeownerId, serviceId)
      await makeLeadRecipient(lead, c.contractorId)

      signInAs({ id: c.userId, email: c.email, role: 'contractor' })
      expect(await engageLead(lead)).toMatchObject({ ok: false, error: 'NOT_VERIFIED' })
    })

    it('refuses when the company was never offered the lead (NOT_OFFERED)', async () => {
      const serviceId = await seedRoofingService()
      const ho = await makeHomeowner()
      const c = await makeContractorWithOwner({})
      await makeContractorService(c.contractorId, serviceId)
      await makeServiceArea(c.contractorId)
      const lead = await makeLead(ho.homeownerId, serviceId)

      signInAs({ id: c.userId, email: c.email, role: 'contractor' })
      expect(await engageLead(lead)).toMatchObject({ ok: false, error: 'NOT_OFFERED' })
    })

    it('refuses when the engagement fee exceeds the balance (INSUFFICIENT_CREDITS)', async () => {
      const serviceId = await seedRoofingService()
      const ho = await makeHomeowner()
      const c = await makeContractorWithOwner({ contractor: { creditBalance: 2 } })
      await makeContractorService(c.contractorId, serviceId)
      await makeServiceArea(c.contractorId)
      const lead = await makeLead(ho.homeownerId, serviceId, { engagementCreditCost: 5 })
      await makeLeadRecipient(lead, c.contractorId)

      signInAs({ id: c.userId, email: c.email, role: 'contractor' })
      expect(await engageLead(lead)).toMatchObject({ ok: false, error: 'INSUFFICIENT_CREDITS', needed: 5, balance: 2 })
    })
  })
})
