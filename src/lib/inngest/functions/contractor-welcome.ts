// `contractor/welcome.requested` — first-run welcome for a new company.
//
// Fired ONLY once the contractor has a confirmed, authenticated session (email
// confirmation link clicked, or Google sign-in), never at raw signup time —
// so we don't congratulate an unconfirmed account. Idempotent: the event is
// sent with a per-user `id`, and the in-app row carries a dedupKey, so multiple
// triggers (callback + choose-role) still produce exactly one welcome.
//
// Split into two steps so the EMAIL can retry on its own: Inngest memoizes a
// successful step, so a transient Resend failure re-runs only the email step,
// not the in-app insert. (The old inline send had no retry — one failure lost
// the welcome for good.)

import { and, eq, inArray } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractorMembers, creditTransactions, users } from '@/lib/db/schema'
import { sendNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/notifications/email'
import { renderEmail } from '@/lib/notifications/email/template'

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''
const WELCOME_SUBJECT = 'Welcome to Hommy 👋'

export const contractorWelcome = inngest.createFunction(
  {
    id: 'contractor-welcome',
    name: 'Send a new company its welcome (credits + how it works)',
    triggers: [{ event: INNGEST_EVENTS.CONTRACTOR_WELCOME }],
    retries: 3,
  },
  async ({ event, step }) => {
    const userId = event.data.userId as string | undefined
    if (!userId) return { ok: false, reason: 'missing userId' }

    // Resolve the recipient + the actual starting credits from the ledger (so the
    // email always quotes what was really granted, not hard-coded constants).
    const info = await step.run('load', async () => {
      const [u] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      if (!u?.email) return null

      const [membership] = await db
        .select({ contractorId: contractorMembers.contractorId })
        .from(contractorMembers)
        .where(eq(contractorMembers.userId, userId))
        .limit(1)
      if (!membership) return null // not a contractor (e.g. stray event) — skip

      const grants = await db
        .select({
          kind: creditTransactions.kind,
          amount: creditTransactions.amount,
          expiresAt: creditTransactions.expiresAt,
        })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.contractorId, membership.contractorId),
            inArray(creditTransactions.kind, ['signup_bonus', 'promo']),
          ),
        )

      let signup = 0
      let promo = 0
      let promoExpiresAt: Date | null = null
      for (const g of grants) {
        if (g.amount <= 0) continue
        if (g.kind === 'signup_bonus') signup += g.amount
        else if (g.kind === 'promo') {
          promo += g.amount
          if (g.expiresAt) promoExpiresAt = g.expiresAt
        }
      }

      return {
        email: u.email,
        signup,
        promo,
        total: signup + promo,
        promoExpires: promoExpiresAt ? promoExpiresAt.toISOString() : null,
      }
    })

    if (!info) return { ok: false, reason: 'no contractor/email for user' }

    const { email, signup, promo, total, promoExpires } = info

    // In-app bell + web push (no email here — that's the next, retryable step).
    await step.run('in-app', async () => {
      await sendNotification({
        userId,
        type: 'SYSTEM',
        title: WELCOME_SUBJECT,
        body: `You've got ${total} credits to start. Receiving leads is free. You only pay 1 credit to start a chat, and the win fee when a homeowner accepts your quote.`,
        actionUrl: '/contractor',
        sendEmail: false,
        dedupKey: `welcome:${userId}`,
      })
    })

    // Email — its own step so Inngest can retry it independently on a Resend hiccup.
    await step.run('email', async () => {
      const expiresStr = promoExpires
        ? new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }).format(new Date(promoExpires))
        : null

      const rows = [{ label: 'Signup credits (never expire)', value: `${signup}` }]
      if (promo > 0) {
        rows.push({
          label: expiresStr ? `Launch bonus (use by ${expiresStr})` : 'Launch bonus',
          value: `${promo}`,
        })
      }

      const html = renderEmail({
        preheader: `Your account is ready. We've added ${total} credits to get you started.`,
        heading: 'Welcome to Hommy',
        intro: `Your account is ready, and we've added <strong>${total} credits</strong> to your wallet to get you started.`,
        highlight: { label: 'Your starting credits', rows },
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

      const res = await sendEmail(email, WELCOME_SUBJECT, html)
      // Surface a send failure so Inngest retries this step (don't swallow it).
      if (!res.success) throw new Error(res.error ?? 'welcome email send failed')
    })

    return { ok: true, userId, total }
  },
)
