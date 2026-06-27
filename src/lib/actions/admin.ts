'use server'

import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { contractors, contractorMembers, purchaseIntents } from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'
import { renderEmail } from '@/lib/notifications/email/template'
import { grantCredits } from '@/lib/credits/ledger'
import { broadcastCreditsChanged } from '@/lib/credits/notify'
import { getAdminContractorDetail, type AdminContractorDetail } from '@/lib/data/admin'
import { revalidateCityPages } from '@/lib/data/locations'
import { revalidateRoofers } from '@/lib/data/roofers'
import { REFERRAL_CREDITS, REFERRAL_EXPIRES_MONTHS } from '@/lib/contractor/referral'

type Result = { success: true } | { success: false; error: string }

const DecisionSchema = z.object({
  contractorId: z.string().uuid('Invalid company'),
  decision: z.enum(['verified', 'rejected']),
})

/**
 * Admin verification decision: flips a company's verificationStatus to
 * `verified` or `rejected`. Verified companies may engage leads (canEngageLeads).
 * Admin-only — enforced by getRequiredUser('admin').
 */
export async function decideVerification(input: unknown): Promise<Result> {
  await getRequiredUser('admin')

  const parsed = DecisionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  }
  const { contractorId, decision } = parsed.data

  // On verification, pay the referral reward ONCE (to both companies) inside the
  // same transaction that flips the status — guarded by referral_rewarded_at and
  // a row lock so concurrent verifies can't double-pay.
  let payout: { referrerId: string; refereeBalance: number; referrerBalance: number } | null = null

  await db.transaction(async (tx) => {
    await tx
      .update(contractors)
      .set({ verificationStatus: decision })
      .where(eq(contractors.id, contractorId))

    if (decision !== 'verified') return

    const [referee] = await tx
      .select({
        referredBy: contractors.referredByContractorId,
        rewardedAt: contractors.referralRewardedAt,
      })
      .from(contractors)
      .where(eq(contractors.id, contractorId))
      .for('update')
      .limit(1)

    if (referee?.referredBy && !referee.rewardedAt && referee.referredBy !== contractorId) {
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + REFERRAL_EXPIRES_MONTHS)
      const refereeBalance = await grantCredits(tx, {
        contractorId,
        kind: 'referral',
        amount: REFERRAL_CREDITS,
        expiresAt,
        sourceType: 'referral',
        sourceId: referee.referredBy,
      })
      const referrerBalance = await grantCredits(tx, {
        contractorId: referee.referredBy,
        kind: 'referral',
        amount: REFERRAL_CREDITS,
        expiresAt,
        sourceType: 'referral',
        sourceId: contractorId,
      })
      await tx
        .update(contractors)
        .set({ referralRewardedAt: new Date() })
        .where(eq(contractors.id, contractorId))
      payout = { referrerId: referee.referredBy, refereeBalance, referrerBalance }
    }
  })

  // Notify both wallets after commit (the referrer likely has a live session).
  if (payout) {
    const p: { referrerId: string; refereeBalance: number; referrerBalance: number } = payout
    void broadcastCreditsChanged(contractorId, p.refereeBalance)
    void broadcastCreditsChanged(p.referrerId, p.referrerBalance)
  }

  // Let the company know the outcome (in-app + email to every active member).
  // Best-effort: a notification failure must not fail the admin's decision.
  try {
    const members = await db
      .select({ userId: contractorMembers.userId })
      .from(contractorMembers)
      .where(
        and(
          eq(contractorMembers.contractorId, contractorId),
          eq(contractorMembers.status, 'active'),
        ),
      )
    const userIds = [...new Set(members.map((m) => m.userId))]

    if (decision === 'verified') {
      // Rich email: tell them their next move (import work + reviews via Google).
      const emailHtml = renderEmail({
        preheader:
          "You're verified on Hommy. You can now engage leads and win work.",
        heading: "You're verified",
        intro:
          'Your documents checked out, so your company is now verified. You can engage leads, send quotes, and win work right away.',
        paragraphs: [
          'Next, make your profile stand out. Connect your Google Business profile and Hommy will pull in your past work photos and customer reviews automatically, so homeowners can see your track record before they even message you.',
        ],
        cta: {
          label: 'Connect Google and add your work',
          url: '/contractor/integrations',
        },
        note: 'You can also add photos and details anytime from your dashboard.',
      })

      await Promise.all(
        userIds.map((userId) =>
          sendNotification({
            userId,
            type: 'SYSTEM',
            title: "You're verified on Hommy",
            body: 'You can now engage leads and win work. Connect your Google profile to import your past work and reviews.',
            actionUrl: '/contractor/integrations',
            emailHtml,
            dedupKey: `verification_verified:${contractorId}`,
          }).catch((err) =>
            console.error('[decideVerification] verified notify failed', {
              userId,
              err,
            }),
          ),
        ),
      )
    } else {
      await Promise.all(
        userIds.map((userId) =>
          sendNotification({
            userId,
            type: 'SYSTEM',
            title: 'Your verification needs another look',
            body: 'Please update your license and insurance documents and resubmit for review.',
            actionUrl: '/contractor/settings/verification',
          }).catch((err) =>
            console.error('[decideVerification] rejected notify failed', {
              userId,
              err,
            }),
          ),
        ),
      )
    }
  } catch (err) {
    console.error('[decideVerification] notify failed', err)
  }

  revalidatePath('/admin/verification')
  revalidatePath('/admin')
  // Verifying/unverifying a company changes city supply AND whether its public
  // /roofers profile is live → refresh both SEO caches.
  revalidateCityPages()
  revalidateRoofers()
  return { success: true }
}

const GrantSchema = z.object({
  contractorId: z.string().uuid('Invalid company'),
  credits: z.number().int().positive('Enter a positive amount').max(100_000),
  kind: z.enum(['purchase', 'adjustment', 'promo', 'refund']).default('adjustment'),
  /** When set, the matching purchase intent is marked fulfilled. */
  intentId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
})

/**
 * Admin manually grants credits to a company — the v1 settlement path for
 * offline payments (a contractor pays out-of-band; admin grants here). When an
 * `intentId` is passed, the purchase request is marked fulfilled. Admin-only.
 */
export async function grantCreditsToContractor(input: unknown): Promise<Result> {
  const admin = await getRequiredUser('admin')

  const parsed = GrantSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  }
  const { contractorId, credits, kind, intentId, note } = parsed.data

  let newBalance = 0
  try {
    await db.transaction(async (tx) => {
      newBalance = await grantCredits(tx, {
        contractorId,
        kind,
        amount: credits,
        sourceType: intentId ? 'purchase_intent' : 'admin_grant',
        sourceId: intentId ?? undefined,
        createdBy: admin.id,
      })
      if (intentId) {
        await tx
          .update(purchaseIntents)
          .set({ status: 'fulfilled', note: note ?? null })
          .where(eq(purchaseIntents.id, intentId))
      }
    })
  } catch (err) {
    console.error('[grantCreditsToContractor] failed', err)
    return { success: false, error: 'Could not grant credits. Please try again.' }
  }

  // Refresh the company's credit chip live.
  void broadcastCreditsChanged(contractorId, newBalance)

  revalidatePath('/admin/credits')
  revalidatePath('/admin')
  return { success: true }
}

/** Lazy-load a company's full record (info + members) for the admin detail dialog. */
export async function getAdminContractorDetailAction(
  contractorId: string,
): Promise<AdminContractorDetail | null> {
  await getRequiredUser('admin')
  if (!z.string().uuid().safeParse(contractorId).success) return null
  return getAdminContractorDetail(contractorId)
}

/** Mark a purchase request declined (dismiss without granting). Admin-only. */
export async function declinePurchaseIntent(intentId: string): Promise<Result> {
  await getRequiredUser('admin')
  if (!z.string().uuid().safeParse(intentId).success) {
    return { success: false, error: 'Invalid request.' }
  }
  await db
    .update(purchaseIntents)
    .set({ status: 'declined' })
    .where(eq(purchaseIntents.id, intentId))
  revalidatePath('/admin/credits')
  return { success: true }
}
