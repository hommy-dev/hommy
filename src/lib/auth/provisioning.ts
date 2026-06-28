// Server-only: provisions a brand-new contractor's account scaffolding.
//
// Called from two places, so it must be IDEMPOTENT:
//   - the email/password signup action (src/lib/actions/auth.ts)
//   - the OAuth callback (src/app/auth/callback/route.ts), where there is no
//     pre-signup step and we only have the authenticated user.
//
// Creates: the public.users row, an empty company, the owner membership, a free
// subscription, and the onboarding credit grants (signup bonus + launch promo).
// Company name, license, services, and service areas are collected later in the
// onboarding wizard.

import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  users,
  contractors,
  contractorMembers,
  subscriptions,
  plans,
  homeowners,
} from '@/lib/db/schema'
import { grantCredits } from '@/lib/credits/ledger'
import { assignReferralCodeIfMissing, resolveReferrer } from '@/lib/contractor/referral'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'

/** Free credits every new company gets, no strings, never expires. */
export const SIGNUP_BONUS_CREDITS = 50
/** Launch-window bonus on top of the signup bonus — expires (see below). */
export const LAUNCH_PROMO_CREDITS = 250
/** The launch promo expires this many months after the company is created. */
export const LAUNCH_PROMO_EXPIRES_MONTHS = 4

export async function provisionContractor({
  userId,
  email,
  fullName,
  passwordSet = true,
  referredByCode,
  avatarUrl,
}: {
  userId: string
  email: string
  fullName: string | null
  passwordSet?: boolean
  /** Referral code from ?ref=… — records who referred this company (credited on verify). */
  referredByCode?: string
  /** Profile photo from an OAuth provider (Google), saved on first provision. */
  avatarUrl?: string | null
}): Promise<void> {
  // Ensure the public.users row exists (upsert — the user may already exist).
  await db
    .insert(users)
    .values({ id: userId, email, fullName, role: 'contractor', passwordSet, avatarUrl: avatarUrl ?? null })
    .onConflictDoUpdate({
      target: users.id,
      // Backfill the avatar if we have one and none is set; never overwrite.
      set: { email, avatarUrl: sql`coalesce(${users.avatarUrl}, ${avatarUrl ?? null})` },
    })

  // Already provisioned (belongs to a company)? Nothing more to do.
  const existing = await db
    .select({ id: contractorMembers.id })
    .from(contractorMembers)
    .where(eq(contractorMembers.userId, userId))
    .limit(1)
  if (existing.length > 0) return

  const [free] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.slug, 'free'))
    .limit(1)

  // Launch-promo expiry (the welcome email reads this back from the ledger later).
  const promoExpiresAt = new Date()
  promoExpiresAt.setMonth(promoExpiresAt.getMonth() + LAUNCH_PROMO_EXPIRES_MONTHS)

  let newCompanyId = ''
  await db.transaction(async (tx) => {
    const [company] = await tx
      .insert(contractors)
      .values({ creditBalance: 0 })
      .returning({ id: contractors.id })
    newCompanyId = company.id

    await tx.insert(contractorMembers).values({
      contractorId: company.id,
      userId,
      role: 'owner',
      status: 'active',
    })

    if (free) {
      await tx.insert(subscriptions).values({
        contractorId: company.id,
        planId: free.id,
        status: 'active',
      })
    }

    // Signup bonus — never expires.
    await grantCredits(tx, {
      contractorId: company.id,
      kind: 'signup_bonus',
      amount: SIGNUP_BONUS_CREDITS,
      sourceType: 'signup',
    })

    // Launch promo — expires LAUNCH_PROMO_EXPIRES_MONTHS out (FIFO spends it first).
    if (LAUNCH_PROMO_CREDITS > 0) {
      await grantCredits(tx, {
        contractorId: company.id,
        kind: 'promo',
        amount: LAUNCH_PROMO_CREDITS,
        expiresAt: promoExpiresAt,
        sourceType: 'launch_promo',
      })
    }

    // Referral: mint this company's own shareable code, and record who referred
    // it (if any). Credits are NOT granted here — they fire on verification.
    await assignReferralCodeIfMissing(tx, company.id)
    if (referredByCode) {
      const referrerId = await resolveReferrer(tx, referredByCode)
      if (referrerId && referrerId !== company.id) {
        await tx
          .update(contractors)
          .set({ referredByContractorId: referrerId })
          .where(eq(contractors.id, company.id))
      }
    }
  })

  // Recruitment attribution: if this signup came from a prospect's claim link
  // (cookie set by /claim/<token>), link the new company back to that prospect so
  // we mark it converted and stop emailing it. Best-effort, never blocks signup.
  await linkRecruitProspect(newCompanyId)

  // NOTE: the welcome email is NOT sent here. Signup can happen before the email
  // is confirmed, and we don't want to welcome an unconfirmed account. It fires
  // from `requestContractorWelcome()` at the first CONFIRMED session (auth
  // callback / choose-role / immediate-session signup), via Inngest (retries).
}

/** Read the recruit-prospect cookie (if any) and link it to the new company. */
async function linkRecruitProspect(contractorId: string): Promise<void> {
  if (!contractorId) return
  try {
    const { cookies } = await import('next/headers')
    const jar = await cookies()
    const prospectId = jar.get('recruit_prospect')?.value
    if (!prospectId) return
    const { linkProspectConversion } = await import('@/lib/recruitment/convert')
    await linkProspectConversion(prospectId, contractorId)
  } catch (err) {
    console.error('[provisionContractor] recruit attribution failed (non-fatal)', err)
  }
}

/**
 * Ask the Inngest welcome job to send a new company its welcome. Safe to call
 * from every confirmed-session entry point: the per-user event `id` + the job's
 * dedupKey guarantee exactly one welcome. Best-effort — never blocks the request.
 */
export async function requestContractorWelcome(userId: string): Promise<void> {
  try {
    await inngest.send({
      name: INNGEST_EVENTS.CONTRACTOR_WELCOME,
      data: { userId },
      id: `welcome-${userId}`,
    })
  } catch (err) {
    console.error('[requestContractorWelcome] inngest send failed (non-fatal)', err)
  }
}

// Provisions a brand-new homeowner. Like provisionContractor, this runs from
// both the email/password signup action and the OAuth callback, so it must be
// IDEMPOTENT. Homeowners have no company or credits — just the public.users row
// and a 1:1 homeowners profile. The dashboard lives at /home.
export async function provisionHomeowner({
  userId,
  email,
  fullName,
  passwordSet = true,
  avatarUrl,
}: {
  userId: string
  email: string
  fullName: string | null
  passwordSet?: boolean
  /** Profile photo from an OAuth provider (Google), saved on first provision. */
  avatarUrl?: string | null
}): Promise<void> {
  await db
    .insert(users)
    .values({ id: userId, email, fullName, role: 'homeowner', passwordSet, avatarUrl: avatarUrl ?? null })
    .onConflictDoUpdate({
      target: users.id,
      // Backfill the avatar if we have one and none is set; never overwrite.
      set: { email, avatarUrl: sql`coalesce(${users.avatarUrl}, ${avatarUrl ?? null})` },
    })

  // Already has a profile? Nothing more to do.
  const existing = await db
    .select({ id: homeowners.id })
    .from(homeowners)
    .where(eq(homeowners.userId, userId))
    .limit(1)
  if (existing.length > 0) return

  await db.insert(homeowners).values({ userId })
}
