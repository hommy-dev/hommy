// Credit ledger — the ONLY way to move credits. `credit_transactions` is the
// append-only source of truth; `contractors.credit_balance` is a cached
// projection updated in the same transaction (docs/HOMEI_PLATFORM.md §3.2).
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
    'signup_bonus' | 'purchase' | 'plan_grant' | 'promo' | 'refund' | 'adjustment'
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
