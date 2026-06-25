'use server'

// Buy-credits request (v1 — NO live payments). A contractor picks a pack/amount
// and "proceeds"; we DON'T charge anything. Instead we record a `purchase_intent`
// and notify platform admins so they can follow up and settle it manually
// (offline payment → admin credit grant). Every click here is also a warm
// upsell signal: the company is out of credits and wants more.
//
// When a real payment provider (Stripe / Paddle / Lemon Squeezy) is wired, this
// action becomes "create checkout session" and the success webhook does the
// `purchase` grant — the UI and intent record stay.

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors, purchaseIntents, users } from '@/lib/db/schema'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser } from '@/lib/data/dashboard'
import { getBalance } from '@/lib/credits/ledger'
import {
  priceCentsForCredits,
  formatCents,
  MIN_CUSTOM_CREDITS,
  MAX_CUSTOM_CREDITS,
} from '@/lib/billing/packs'
import { sendNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/notifications/email'
import { renderEmail } from '@/lib/notifications/email/template'
import { captureServerEvent } from '@/lib/analytics/posthog-server'

export type PurchaseRequestResult =
  | { ok: true; credits: number; amountCents: number }
  | { ok: false; message: string }

export async function requestCreditPurchase(creditsInput: number): Promise<PurchaseRequestResult> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return { ok: false, message: 'Set up your company before buying credits.' }

  const parsed = z
    .number()
    .int()
    .min(MIN_CUSTOM_CREDITS)
    .max(MAX_CUSTOM_CREDITS)
    .safeParse(creditsInput)
  if (!parsed.success) {
    return { ok: false, message: `Pick between ${MIN_CUSTOM_CREDITS} and ${MAX_CUSTOM_CREDITS} credits.` }
  }
  const credits = parsed.data
  const amountCents = priceCentsForCredits(credits)
  const balance = await getBalance(db, contractor.id)

  const [company] = await db
    .select({ name: contractors.companyName })
    .from(contractors)
    .where(eq(contractors.id, contractor.id))
    .limit(1)
  const companyName = company?.name ?? 'A contractor'

  const [intent] = await db
    .insert(purchaseIntents)
    .values({
      contractorId: contractor.id,
      requestedBy: user.id,
      credits,
      amountCents,
      balanceAtRequest: balance,
    })
    .returning({ id: purchaseIntents.id })

  // Best-effort: alert the platform so they can close the sale by hand. Never
  // fail the request if notification fails.
  try {
    await notifyAdminsOfPurchaseIntent({
      intentId: intent.id,
      companyName,
      credits,
      amountCents,
      balance,
    })
  } catch (err) {
    console.error('[requestCreditPurchase] admin notify failed (non-fatal)', err)
  }

  // Funnel: contractor wants to buy credits (warm upsell intent — payments aren't
  // live yet, so this is the closest "purchase" signal we have).
  captureServerEvent(
    user.id,
    'credits_purchase_intent',
    { credits, amountCents, balanceAtRequest: balance },
    { company: contractor.id },
  )

  return { ok: true, credits, amountCents }
}

async function notifyAdminsOfPurchaseIntent(args: {
  intentId: string
  companyName: string
  credits: number
  amountCents: number
  balance: number
}): Promise<void> {
  const { intentId, companyName, credits, amountCents, balance } = args
  const title = 'Credit purchase request'
  const body = `${companyName} wants to buy ${credits} credits (${formatCents(amountCents)}). Current balance: ${balance}.`
  const html = renderEmail({
    preheader: body,
    heading: 'Credit purchase request',
    intro: `<strong>${companyName}</strong> wants to buy <strong>${credits} credits</strong>.`,
    highlight: {
      rows: [
        { label: 'Company', value: companyName },
        { label: 'Credits', value: `${credits}` },
        { label: 'Amount', value: formatCents(amountCents) },
        { label: 'Current balance', value: `${balance}` },
      ],
    },
    paragraphs: [
      "Payments aren't live yet — reach out, take payment, then grant the credits from the admin panel.",
    ],
    cta: { label: 'Open admin panel', url: '/admin' },
  })

  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'))

  if (admins.length > 0) {
    await Promise.all(
      admins.map((a) =>
        sendNotification({
          userId: a.id,
          type: 'SYSTEM',
          title,
          body,
          actionUrl: '/admin',
          emailHtml: html,
          dedupKey: `purchase-intent:${intentId}`,
        }),
      ),
    )
    return
  }

  // No admin users yet — fall back to a plain email to the platform owner.
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL ?? process.env.NEXT_PUBLIC_FROM_EMAIL
  if (ownerEmail) await sendEmail(ownerEmail, title, html)
}
