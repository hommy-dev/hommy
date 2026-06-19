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

import { eq } from 'drizzle-orm'
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
}: {
  userId: string
  email: string
  fullName: string | null
  passwordSet?: boolean
}): Promise<void> {
  // Ensure the public.users row exists (upsert — the user may already exist).
  await db
    .insert(users)
    .values({ id: userId, email, fullName, role: 'contractor', passwordSet })
    .onConflictDoUpdate({ target: users.id, set: { email } })

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

  await db.transaction(async (tx) => {
    const [company] = await tx
      .insert(contractors)
      .values({ creditBalance: 0 })
      .returning({ id: contractors.id })

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
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + LAUNCH_PROMO_EXPIRES_MONTHS)
      await grantCredits(tx, {
        contractorId: company.id,
        kind: 'promo',
        amount: LAUNCH_PROMO_CREDITS,
        expiresAt,
        sourceType: 'launch_promo',
      })
    }
  })
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
}: {
  userId: string
  email: string
  fullName: string | null
  passwordSet?: boolean
}): Promise<void> {
  await db
    .insert(users)
    .values({ id: userId, email, fullName, role: 'homeowner', passwordSet })
    .onConflictDoUpdate({ target: users.id, set: { email } })

  // Already has a profile? Nothing more to do.
  const existing = await db
    .select({ id: homeowners.id })
    .from(homeowners)
    .where(eq(homeowners.userId, userId))
    .limit(1)
  if (existing.length > 0) return

  await db.insert(homeowners).values({ userId })
}
