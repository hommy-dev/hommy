// Data layer for the admin console (v2). Privileged Drizzle connection (RLS
// bypassed); admin authorization is enforced by the caller (getRequiredUser('admin')).
// NOT cached — verification state and counts must be fresh.

import { db } from '@/lib/db'
import { and, count, desc, eq, isNotNull } from 'drizzle-orm'
import { contractors, contractorMembers, purchaseIntents, users } from '@/lib/db/schema'

export type VerificationQueueItem = {
  contractorId: string
  companyName: string | null
  licenseNumber: string | null
  licenseDocUrl: string | null
  insuranceProvider: string | null
  insuranceDocUrl: string | null
  ownerName: string | null
  ownerEmail: string | null
  submittedAt: Date
}

/**
 * Companies awaiting verification: status `pending` with BOTH documents
 * uploaded (matches the "in_review" state in getVerificationState). Oldest
 * first — admins work the queue front-to-back.
 */
export async function getVerificationQueue(): Promise<VerificationQueueItem[]> {
  const rows = await db
    .select({
      contractorId: contractors.id,
      companyName: contractors.companyName,
      licenseNumber: contractors.licenseNumber,
      licenseDocUrl: contractors.licenseDocUrl,
      insuranceProvider: contractors.insuranceProvider,
      insuranceDocUrl: contractors.insuranceDocUrl,
      ownerName: users.fullName,
      ownerEmail: users.email,
      submittedAt: contractors.createdAt,
    })
    .from(contractors)
    .leftJoin(
      contractorMembers,
      and(
        eq(contractorMembers.contractorId, contractors.id),
        eq(contractorMembers.role, 'owner'),
      ),
    )
    .leftJoin(users, eq(users.id, contractorMembers.userId))
    .where(
      and(
        eq(contractors.verificationStatus, 'pending'),
        isNotNull(contractors.licenseDocUrl),
        isNotNull(contractors.insuranceDocUrl),
      ),
    )
    .orderBy(contractors.createdAt)

  return rows
}

export type AdminStats = {
  pendingVerifications: number
  verifiedContractors: number
  totalContractors: number
}

export async function getAdminStats(): Promise<AdminStats> {
  const [pending, verified, total] = await Promise.all([
    db
      .select({ value: count() })
      .from(contractors)
      .where(
        and(
          eq(contractors.verificationStatus, 'pending'),
          isNotNull(contractors.licenseDocUrl),
          isNotNull(contractors.insuranceDocUrl),
        ),
      ),
    db
      .select({ value: count() })
      .from(contractors)
      .where(eq(contractors.verificationStatus, 'verified')),
    db.select({ value: count() }).from(contractors),
  ])

  return {
    pendingVerifications: pending[0]?.value ?? 0,
    verifiedContractors: verified[0]?.value ?? 0,
    totalContractors: total[0]?.value ?? 0,
  }
}

export type RecentContractor = {
  id: string
  companyName: string | null
  verificationStatus: (typeof contractors.verificationStatus.enumValues)[number]
  createdAt: Date
}

/** Newest companies, for the admin overview. */
export async function getRecentContractors(
  limit = 8,
): Promise<RecentContractor[]> {
  return db
    .select({
      id: contractors.id,
      companyName: contractors.companyName,
      verificationStatus: contractors.verificationStatus,
      createdAt: contractors.createdAt,
    })
    .from(contractors)
    .orderBy(desc(contractors.createdAt))
    .limit(limit)
}

export type PurchaseIntentRow = {
  id: string
  contractorId: string
  companyName: string | null
  currentBalance: number
  credits: number
  amountCents: number
  balanceAtRequest: number
  status: (typeof purchaseIntents.status.enumValues)[number]
  requestedByName: string | null
  requestedByEmail: string | null
  createdAt: Date
}

/**
 * Credit-purchase requests (v1 manual settlement). Newest first; the page shows
 * `requested` ones with a Grant action and keeps fulfilled/declined as history.
 */
export async function getPurchaseIntents(limit = 100): Promise<PurchaseIntentRow[]> {
  return db
    .select({
      id: purchaseIntents.id,
      contractorId: purchaseIntents.contractorId,
      companyName: contractors.companyName,
      currentBalance: contractors.creditBalance,
      credits: purchaseIntents.credits,
      amountCents: purchaseIntents.amountCents,
      balanceAtRequest: purchaseIntents.balanceAtRequest,
      status: purchaseIntents.status,
      requestedByName: users.fullName,
      requestedByEmail: users.email,
      createdAt: purchaseIntents.createdAt,
    })
    .from(purchaseIntents)
    .innerJoin(contractors, eq(contractors.id, purchaseIntents.contractorId))
    .leftJoin(users, eq(users.id, purchaseIntents.requestedBy))
    .orderBy(desc(purchaseIntents.createdAt))
    .limit(limit)
}
