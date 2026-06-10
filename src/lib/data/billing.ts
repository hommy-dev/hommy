// Billing data for the contractor settings hub — read-only for now (Stripe
// wiring comes later). Credits balance is the cached projection on contractors;
// the ledger is the append-only credit_transactions source of truth.

import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contractors,
  creditTransactions,
  plans,
  subscriptions,
} from '@/lib/db/schema'

export type CreditKind = (typeof creditTransactions.kind.enumValues)[number]
export type SubscriptionStatus = (typeof subscriptions.status.enumValues)[number]

export type LedgerEntry = {
  id: string
  kind: CreditKind
  amount: number
  balanceAfter: number
  createdAt: Date
  expiresAt: Date | null
}

export type CurrentPlan = {
  name: string
  priceCents: number
  billingInterval: (typeof plans.billingInterval.enumValues)[number]
  monthlyCredits: number
  maxMembers: number
  status: SubscriptionStatus
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

export type PlanOption = {
  id: string
  slug: string
  name: string
  priceCents: number
  billingInterval: (typeof plans.billingInterval.enumValues)[number]
  monthlyCredits: number
  maxMembers: number
  features: Record<string, unknown>
}

export type BillingData = {
  creditBalance: number
  plan: CurrentPlan | null
  ledger: LedgerEntry[]
}

export async function getBilling(contractorId: string): Promise<BillingData> {
  const [contractor] = await db
    .select({ creditBalance: contractors.creditBalance })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1)

  const [sub] = await db
    .select({
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      name: plans.name,
      priceCents: plans.priceCents,
      billingInterval: plans.billingInterval,
      monthlyCredits: plans.monthlyCredits,
      maxMembers: plans.maxMembers,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        eq(subscriptions.contractorId, contractorId),
        eq(subscriptions.status, 'active'),
      ),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)

  const ledger = await db
    .select({
      id: creditTransactions.id,
      kind: creditTransactions.kind,
      amount: creditTransactions.amount,
      balanceAfter: creditTransactions.balanceAfter,
      createdAt: creditTransactions.createdAt,
      expiresAt: creditTransactions.expiresAt,
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.contractorId, contractorId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(50)

  return {
    creditBalance: contractor?.creditBalance ?? 0,
    plan: sub
      ? {
          name: sub.name,
          priceCents: sub.priceCents,
          billingInterval: sub.billingInterval,
          monthlyCredits: sub.monthlyCredits,
          maxMembers: sub.maxMembers,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
    ledger,
  }
}

export async function getActivePlans(): Promise<PlanOption[]> {
  return db
    .select({
      id: plans.id,
      slug: plans.slug,
      name: plans.name,
      priceCents: plans.priceCents,
      billingInterval: plans.billingInterval,
      monthlyCredits: plans.monthlyCredits,
      maxMembers: plans.maxMembers,
      features: plans.features,
    })
    .from(plans)
    .where(eq(plans.isActive, true))
    .orderBy(plans.sortOrder)
}
