// Credit ledger — the ONLY way to move credits. `credit_transactions` is the
// append-only source of truth; `contractors.credit_balance` is a cached
// projection updated in the same transaction (docs/HOMMY_PLATFORM.md §3.2).
//
// Every helper here MUST run inside a caller-provided Drizzle transaction so the
// ledger write + balance update + the surrounding business mutation (engage,
// accept, …) commit atomically. The contractor row is locked FOR UPDATE first
// so concurrent spends can't race the balance.
//
// NOTE (FIFO/expiry): spends adjust the running balance only; per-lot FIFO
// consumption of expiring plan grants is reconciled later by the `credits.expire`
// cron, which writes negative `expiry` entries for unspent expired grants. The
// signed append-only ledger supports that without changing this spend path.

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors, creditTransactions } from '@/lib/db/schema'

/** An open Drizzle transaction handle (what `db.transaction(tx => …)` passes). */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type CreditKind = (typeof creditTransactions.kind.enumValues)[number]

/** Thrown by `spendCredits` when the company can't cover the spend. */
export class InsufficientCreditsError extends Error {
  readonly needed: number
  readonly balance: number
  constructor(needed: number, balance: number) {
    super(`Insufficient credits: need ${needed}, have ${balance}`)
    this.name = 'InsufficientCreditsError'
    this.needed = needed
    this.balance = balance
  }
}

/** Lock + read the company's cached balance. Use inside a transaction. */
export async function lockBalance(tx: Tx, contractorId: string): Promise<number> {
  const [row] = await tx
    .select({ balance: contractors.creditBalance })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .for('update')
    .limit(1)
  if (!row) throw new Error(`Contractor not found: ${contractorId}`)
  return row.balance
}

type SpendArgs = {
  contractorId: string
  kind: Extract<CreditKind, 'lead_engagement' | 'lead_won' | 'ai_agent' | 'marketing'>
  /** Positive number of credits to spend. */
  amount: number
  /**
   * Allow the balance to go negative instead of throwing. Used for `lead_won`:
   * the full award charge fires on the HOMEOWNER's accept and must always
   * succeed (affordability was reserved at engage; any shortfall is reconciled
   * by billing). Default false — engagement and other spends still gate on funds.
   */
  allowNegative?: boolean
  sourceType?: string
  sourceId?: string
  createdBy?: string | null
}

/**
 * Spend credits: locks the company, verifies funds, appends a negative ledger
 * entry, and updates the cached balance. Returns the new balance.
 * Throws `InsufficientCreditsError` if funds are short (unless `allowNegative`).
 */
export async function spendCredits(tx: Tx, args: SpendArgs): Promise<number> {
  const { contractorId, kind, amount, allowNegative, sourceType, sourceId, createdBy } = args
  if (amount <= 0) return lockBalance(tx, contractorId)

  const balance = await lockBalance(tx, contractorId)
  if (balance < amount && !allowNegative) throw new InsufficientCreditsError(amount, balance)

  const newBalance = balance - amount
  await tx.insert(creditTransactions).values({
    contractorId,
    kind,
    amount: -amount,
    balanceAfter: newBalance,
    sourceType: sourceType ?? null,
    sourceId: sourceId ?? null,
    createdBy: createdBy ?? null,
  })
  await tx
    .update(contractors)
    .set({ creditBalance: newBalance })
    .where(eq(contractors.id, contractorId))
  return newBalance
}

type GrantArgs = {
  contractorId: string
  kind: Extract<
    CreditKind,
    'signup_bonus' | 'purchase' | 'plan_grant' | 'promo' | 'refund' | 'adjustment' | 'referral'
  >
  /** Positive number of credits to grant. */
  amount: number
  /** Set for plan grants (expire at cycle end); null = never expires. */
  expiresAt?: Date | null
  sourceType?: string
  sourceId?: string
  createdBy?: string | null
}

/** Grant credits: appends a positive ledger entry and bumps the cached balance. */
export async function grantCredits(tx: Tx, args: GrantArgs): Promise<number> {
  const { contractorId, kind, amount, expiresAt, sourceType, sourceId, createdBy } = args
  if (amount <= 0) return lockBalance(tx, contractorId)

  const balance = await lockBalance(tx, contractorId)
  const newBalance = balance + amount
  await tx.insert(creditTransactions).values({
    contractorId,
    kind,
    amount,
    balanceAfter: newBalance,
    expiresAt: expiresAt ?? null,
    sourceType: sourceType ?? null,
    sourceId: sourceId ?? null,
    createdBy: createdBy ?? null,
  })
  await tx
    .update(contractors)
    .set({ creditBalance: newBalance })
    .where(eq(contractors.id, contractorId))
  return newBalance
}

/**
 * FIFO expiry reconciliation for ONE company. Replays the ledger: spends consume
 * the oldest-expiring lots first (never-expire lots last); whatever credits are
 * still sitting in an ALREADY-EXPIRED lot are written off with a negative
 * `expiry` entry. Idempotent — a prior `expiry` entry counts as consumption, so a
 * second run finds nothing new. Must run inside a transaction; locks the company
 * row first. Returns the credits expired (>= 0) and the resulting balance.
 */
export async function expireStaleCredits(
  tx: Tx,
  contractorId: string,
  now: Date,
): Promise<{ expired: number; newBalance: number }> {
  const balance = await lockBalance(tx, contractorId)

  const rows = await tx
    .select({
      amount: creditTransactions.amount,
      expiresAt: creditTransactions.expiresAt,
      createdAt: creditTransactions.createdAt,
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.contractorId, contractorId))

  // Positive lots, oldest-expiring first; never-expire (null) lots go last so
  // spends drain expiring credits before permanent ones.
  const lots = rows
    .filter((r) => r.amount > 0)
    .map((r) => ({ remaining: r.amount, expiresAt: r.expiresAt, createdAt: r.createdAt }))
    .sort((a, b) => {
      const ax = a.expiresAt ? a.expiresAt.getTime() : Infinity
      const bx = b.expiresAt ? b.expiresAt.getTime() : Infinity
      return ax !== bx ? ax - bx : a.createdAt.getTime() - b.createdAt.getTime()
    })

  // Everything ever spent (incl. prior expiries) drains lots in FIFO order.
  let consume = rows.reduce((sum, r) => (r.amount < 0 ? sum - r.amount : sum), 0)
  for (const lot of lots) {
    if (consume <= 0) break
    const drain = Math.min(consume, lot.remaining)
    lot.remaining -= drain
    consume -= drain
  }

  // Credits still left in already-expired lots are written off.
  const toExpire = lots.reduce(
    (sum, lot) => (lot.expiresAt && lot.expiresAt <= now ? sum + lot.remaining : sum),
    0,
  )
  if (toExpire <= 0) return { expired: 0, newBalance: balance }

  const newBalance = balance - toExpire
  await tx.insert(creditTransactions).values({
    contractorId,
    kind: 'expiry',
    amount: -toExpire,
    balanceAfter: newBalance,
    sourceType: 'cron',
  })
  await tx
    .update(contractors)
    .set({ creditBalance: newBalance })
    .where(eq(contractors.id, contractorId))

  return { expired: toExpire, newBalance }
}

/** Cached balance (no lock) — for display/affordability reads outside a txn. */
export async function getBalance(
  executor: typeof db | Tx,
  contractorId: string,
): Promise<number> {
  const [row] = await executor
    .select({ balance: contractors.creditBalance })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1)
  return row?.balance ?? 0
}
