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
import { assignReferralCodeIfMissing, resolveReferrer } from '@/lib/contractor/referral'
import { sendNotification } from '@/lib/notifications'
import { renderEmail } from '@/lib/notifications/email/template'

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
}: {
  userId: string
  email: string
  fullName: string | null
  passwordSet?: boolean
  /** Referral code from ?ref=… — records who referred this company (credited on verify). */
  referredByCode?: string
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

  // Computed before the txn so the welcome message can quote the same date.
  const promoExpiresAt = new Date()
  promoExpiresAt.setMonth(promoExpiresAt.getMonth() + LAUNCH_PROMO_EXPIRES_MONTHS)

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

  // Welcome — what they got + how credits work. Best-effort (never block signup).
  await sendContractorWelcome({ userId, expiresAt: promoExpiresAt }).catch((err) =>
    console.error('[provisionContractor] welcome send failed (non-fatal)', err),
  )
}

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

/** First-run welcome: explains the starting credits + how the economy works. */
async function sendContractorWelcome({ userId, expiresAt }: { userId: string; expiresAt: Date }): Promise<void> {
  const total = SIGNUP_BONUS_CREDITS + LAUNCH_PROMO_CREDITS
  const expiresStr = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(expiresAt)
  const html = renderEmail({
    preheader: `Your account is ready — we've added ${total} credits to get you started.`,
    heading: 'Welcome to Hommy',
    intro: `Your account is ready — and we've added <strong>${total} credits</strong> to your wallet to get you started.`,
    highlight: {
      label: 'Your starting credits',
      rows: [
        { label: 'Signup credits (never expire)', value: `${SIGNUP_BONUS_CREDITS}` },
        { label: `Launch bonus (use by ${expiresStr})`, value: `${LAUNCH_PROMO_CREDITS}` },
      ],
    },
    paragraphs: ['Here’s how credits work:'],
    bullets: [
      { strong: 'Getting leads is free.', text: 'Every matching job shows up at no cost.' },
      { strong: '1 credit to start a chat,', text: "which unlocks the homeowner's contact details." },
      {
        strong: 'You only pay the win fee when you win',
        text: 'a small % of the job, charged when the homeowner accepts your quote. No win, no fee.',
      },
    ],
    cta: { label: 'Open your dashboard', url: `${APP_URL}/contractor` },
  })
  await sendNotification({
    userId,
    type: 'SYSTEM',
    title: 'Welcome to Hommy 👋',
    body: `You've got ${total} credits to start. Receiving leads is free — you only pay 1 credit to start a chat, and the win fee when a homeowner accepts your quote.`,
    actionUrl: '/contractor',
    emailHtml: html,
    dedupKey: `welcome:${userId}`,
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
