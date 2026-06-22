import { beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors, creditTransactions } from '@/lib/db/schema'
import {
  expireStaleCredits,
  getBalance,
  grantCredits,
  InsufficientCreditsError,
  spendCredits,
} from '@/lib/credits/ledger'
import { makeContractor } from '../fixtures'

/**
 * The credit ledger is the money source of truth (docs §3.2): `credit_transactions`
 * is append-only and `contractors.credit_balance` is a cached projection kept in
 * lockstep. These tests assert that invariant directly against the test DB — no
 * Next runtime, no Inngest, no mocks. Each helper runs inside a transaction.
 *
 *   Run:  pnpm test:db:up && pnpm test:integration
 */

/** Run a ledger op inside its own transaction (what real actions do). */
function tx<T>(fn: Parameters<typeof db.transaction<T>>[0]): Promise<T> {
  return db.transaction(fn)
}

async function ledgerRows(contractorId: string) {
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.contractorId, contractorId))
}

async function cachedBalance(contractorId: string): Promise<number> {
  const [row] = await db
    .select({ b: contractors.creditBalance })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
  return row.b
}

describe('credit ledger', () => {
  beforeAll(() => {
    if (!process.env.DATABASE_URL?.includes('localhost')) {
      throw new Error('Integration tests must point at the localhost test DB (.env.test).')
    }
  })

  describe('spendCredits', () => {
    it('writes one negative entry with the right balanceAfter and updates the cached balance', async () => {
      const id = await makeContractor({ creditBalance: 100 })

      const newBalance = await tx((t) =>
        spendCredits(t, { contractorId: id, kind: 'lead_engagement', amount: 30, sourceType: 'lead' }),
      )

      expect(newBalance).toBe(70)
      const rows = await ledgerRows(id)
      expect(rows).toHaveLength(1)
      expect(rows[0].amount).toBe(-30)
      expect(rows[0].balanceAfter).toBe(70)
      expect(rows[0].kind).toBe('lead_engagement')
      expect(await cachedBalance(id)).toBe(70)
    })

    it('throws InsufficientCreditsError (with needed/balance) and writes nothing when short', async () => {
      const id = await makeContractor({ creditBalance: 10 })

      await expect(
        tx((t) => spendCredits(t, { contractorId: id, kind: 'lead_engagement', amount: 25 })),
      ).rejects.toMatchObject({ name: 'InsufficientCreditsError', needed: 25, balance: 10 })

      // The rejected transaction rolled back — balance untouched, no ledger row.
      expect(await cachedBalance(id)).toBe(10)
      expect(await ledgerRows(id)).toHaveLength(0)
    })

    it('exposes typed needed/balance on the thrown error', async () => {
      const id = await makeContractor({ creditBalance: 3 })
      const err = await tx((t) =>
        spendCredits(t, { contractorId: id, kind: 'lead_won', amount: 50 }),
      ).catch((e) => e)
      expect(err).toBeInstanceOf(InsufficientCreditsError)
      expect((err as InsufficientCreditsError).needed).toBe(50)
      expect((err as InsufficientCreditsError).balance).toBe(3)
    })

    it('allowNegative drives the balance below zero (the lead_won safety net)', async () => {
      const id = await makeContractor({ creditBalance: 20 })

      const newBalance = await tx((t) =>
        spendCredits(t, { contractorId: id, kind: 'lead_won', amount: 90, allowNegative: true }),
      )

      expect(newBalance).toBe(-70)
      const rows = await ledgerRows(id)
      expect(rows[0].amount).toBe(-90)
      expect(rows[0].balanceAfter).toBe(-70)
      expect(await cachedBalance(id)).toBe(-70)
    })

    it('is a no-op for a zero or negative amount (no row, balance unchanged)', async () => {
      const id = await makeContractor({ creditBalance: 50 })

      const afterZero = await tx((t) => spendCredits(t, { contractorId: id, kind: 'ai_agent', amount: 0 }))
      const afterNeg = await tx((t) => spendCredits(t, { contractorId: id, kind: 'ai_agent', amount: -5 }))

      expect(afterZero).toBe(50)
      expect(afterNeg).toBe(50)
      expect(await ledgerRows(id)).toHaveLength(0)
      expect(await cachedBalance(id)).toBe(50)
    })
  })

  describe('grantCredits', () => {
    it('writes a positive entry, bumps the cached balance, and stores the expiry', async () => {
      const id = await makeContractor({ creditBalance: 0 })
      const expiresAt = new Date('2027-01-01T00:00:00Z')

      const newBalance = await tx((t) =>
        grantCredits(t, { contractorId: id, kind: 'plan_grant', amount: 200, expiresAt }),
      )

      expect(newBalance).toBe(200)
      const rows = await ledgerRows(id)
      expect(rows).toHaveLength(1)
      expect(rows[0].amount).toBe(200)
      expect(rows[0].balanceAfter).toBe(200)
      expect(rows[0].expiresAt?.toISOString()).toBe(expiresAt.toISOString())
      expect(await cachedBalance(id)).toBe(200)
    })

    it('is a no-op for a zero or negative grant', async () => {
      const id = await makeContractor({ creditBalance: 10 })
      const after = await tx((t) => grantCredits(t, { contractorId: id, kind: 'promo', amount: 0 }))
      expect(after).toBe(10)
      expect(await ledgerRows(id)).toHaveLength(0)
    })
  })

  describe('expireStaleCredits (FIFO)', () => {
    const NOW = new Date('2026-06-22T00:00:00Z')
    const YESTERDAY = new Date('2026-06-21T00:00:00Z')
    const NEXT_YEAR = new Date('2027-06-22T00:00:00Z')

    it('writes off only the credits still sitting in an already-expired lot', async () => {
      const id = await makeContractor({ creditBalance: 0 })
      await tx((t) => grantCredits(t, { contractorId: id, kind: 'plan_grant', amount: 50, expiresAt: YESTERDAY }))
      await tx((t) => grantCredits(t, { contractorId: id, kind: 'plan_grant', amount: 30, expiresAt: NEXT_YEAR }))

      const { expired, newBalance } = await tx((t) => expireStaleCredits(t, id, NOW))

      expect(expired).toBe(50)
      expect(newBalance).toBe(30)
      expect(await cachedBalance(id)).toBe(30)
      // The write-off is its own ledger entry.
      const expiryRows = (await ledgerRows(id)).filter((r) => r.kind === 'expiry')
      expect(expiryRows).toHaveLength(1)
      expect(expiryRows[0].amount).toBe(-50)
    })

    it('drains spends from the oldest-expiring lot first, so nothing is left to expire', async () => {
      const id = await makeContractor({ creditBalance: 0 })
      await tx((t) => grantCredits(t, { contractorId: id, kind: 'plan_grant', amount: 50, expiresAt: YESTERDAY }))
      await tx((t) => grantCredits(t, { contractorId: id, kind: 'plan_grant', amount: 30, expiresAt: NEXT_YEAR }))
      // Spend 50 — FIFO consumes the about-to-expire lot entirely.
      await tx((t) => spendCredits(t, { contractorId: id, kind: 'lead_engagement', amount: 50 }))

      const { expired, newBalance } = await tx((t) => expireStaleCredits(t, id, NOW))

      expect(expired).toBe(0)
      expect(newBalance).toBe(30)
      expect((await ledgerRows(id)).some((r) => r.kind === 'expiry')).toBe(false)
    })

    it('never expires a never-expire (null) lot', async () => {
      const id = await makeContractor({ creditBalance: 0 })
      await tx((t) => grantCredits(t, { contractorId: id, kind: 'signup_bonus', amount: 40, expiresAt: null }))

      const { expired, newBalance } = await tx((t) => expireStaleCredits(t, id, NOW))

      expect(expired).toBe(0)
      expect(newBalance).toBe(40)
    })

    it('is idempotent — a second run finds nothing new', async () => {
      const id = await makeContractor({ creditBalance: 0 })
      await tx((t) => grantCredits(t, { contractorId: id, kind: 'plan_grant', amount: 50, expiresAt: YESTERDAY }))

      const first = await tx((t) => expireStaleCredits(t, id, NOW))
      const second = await tx((t) => expireStaleCredits(t, id, NOW))

      expect(first.expired).toBe(50)
      expect(second.expired).toBe(0)
      expect((await ledgerRows(id)).filter((r) => r.kind === 'expiry')).toHaveLength(1)
    })
  })

  describe('getBalance', () => {
    it('returns the cached projection (0 for an unknown company)', async () => {
      const id = await makeContractor({ creditBalance: 77 })
      expect(await getBalance(db, id)).toBe(77)
      expect(await getBalance(db, '00000000-0000-0000-0000-000000000000')).toBe(0)
    })
  })
})
