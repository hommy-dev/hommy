/**
 * End-to-end test of the NOTIFICATION pipeline (not just raw Resend).
 *
 * Unlike `email:test` (which calls Resend directly), this drives the real
 * `sendNotification()` core — the same function every lifecycle event uses — for
 * each notification type the app sends, so it proves the in-app row + the email
 * (via the fallback HTML template) actually dispatch for a real user.
 *
 * Usage:
 *   pnpm notifications:test -- --to=you@example.com
 *   pnpm notifications:test -- --userId=<uuid>
 *
 * Resolution:
 *   • --userId  → use that user row directly
 *   • --to      → look up the user with that email (sendNotification reads the
 *                 user's email/phone from the DB, so the user must exist)
 *
 * What it reports, per scenario: the in-app insert result and the email result
 * (success / error) returned by sendNotification — so a misconfigured Resend key,
 * unverified FROM domain, or free-tier recipient restriction is obvious.
 *
 * NOTE: with no RESEND_API_KEY set, email falls back to a console stub and
 * reports success:true (it logged instead of sending) — the script flags this.
 */

import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '../src/lib/db'
import { users } from '../src/lib/db/schema'
import { sendNotification, type SendNotificationOptions } from '../src/lib/notifications'

type Args = { to?: string; userId?: string }

function parseArgs(argv: string[]): Args {
  const out: Args = {}
  for (const arg of argv) {
    if (arg.startsWith('--to=')) out.to = arg.slice('--to='.length)
    else if (arg.startsWith('--userId=')) out.userId = arg.slice('--userId='.length)
  }
  return out
}

// One representative payload per lifecycle email the app sends. A unique run
// stamp keeps dedupKeys from colliding across repeated test runs.
function scenarios(stamp: string): Array<{ name: string; opts: Omit<SendNotificationOptions, 'userId'> }> {
  return [
    {
      name: 'New lead offered (contractor)',
      opts: { type: 'LEAD', title: 'New lead in your area', body: 'A homeowner posted a roofing job nearby.', actionUrl: '/contractor/jobs', dedupKey: `test-lead:${stamp}` },
    },
    {
      name: 'Quote sent (homeowner)',
      opts: { type: 'ESTIMATE', title: 'Acme Roofing sent you a quote', body: 'Acme quoted $8,400 for your job. Open the chat to review and accept it.', actionUrl: '/homeowner/requests', dedupKey: `test-quote-sent:${stamp}` },
    },
    {
      name: 'You won the job (contractor)',
      opts: { type: 'ESTIMATE', title: 'You won the job! 🎉', body: 'The homeowner accepted your quote. Open the job to get started.', actionUrl: '/contractor/jobs', dedupKey: `test-quote-won:${stamp}` },
    },
    {
      name: 'You’re hired — quote accepted (homeowner)',
      opts: { type: 'ESTIMATE', title: 'You’re hired — quote accepted', body: 'You accepted Acme Roofing’s quote. They’ll be in touch to schedule the work.', actionUrl: '/homeowner/requests', dedupKey: `test-accept:${stamp}` },
    },
    {
      name: 'Job complete (homeowner)',
      opts: { type: 'SYSTEM', title: 'Your job is complete', body: 'Acme Roofing marked the job as completed. We’ll ask you for a quick review shortly.', actionUrl: '/homeowner/requests', dedupKey: `test-complete:${stamp}` },
    },
  ]
}

async function resolveUser(args: Args): Promise<{ id: string; email: string | null } | null> {
  if (args.userId) {
    const [u] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, args.userId)).limit(1)
    return u ?? null
  }
  if (args.to) {
    const [u] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, args.to)).limit(1)
    return u ?? null
  }
  return null
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const hasResend = Boolean(process.env.RESEND_API_KEY)

  console.log('[notifications:test] config', {
    hasResendApiKey: hasResend,
    from: process.env.NEXT_PUBLIC_FROM_EMAIL ?? 'notifications@homei.com (default)',
  })
  if (!hasResend) {
    console.warn(
      '[notifications:test] RESEND_API_KEY is NOT set — emails will be STUBBED (logged, not sent). ' +
        'Email results will still report success:true. Set RESEND_API_KEY to test real delivery.',
    )
  }

  if (!args.to && !args.userId) {
    console.error('[notifications:test] Pass --to=you@example.com (an existing user) or --userId=<uuid>.')
    process.exit(1)
  }

  const user = await resolveUser(args)
  if (!user) {
    console.error(
      `[notifications:test] No user found for ${args.userId ? `userId=${args.userId}` : `email=${args.to}`}. ` +
        'sendNotification reads the recipient email from the users table, so the user must exist. ' +
        '(Tip: sign up that email, or pass an existing --userId.)',
    )
    process.exit(1)
  }
  console.log('[notifications:test] target user', { id: user.id, email: user.email })

  const stamp = String(Date.now())
  let failures = 0

  for (const s of scenarios(stamp)) {
    const t0 = Date.now()
    try {
      const res = await sendNotification({
        userId: user.id,
        ...s.opts,
        sendEmail: true,
        sendPush: false,
        sendSms: false,
      })
      const tookMs = Date.now() - t0
      const emailOk = res.email?.success ?? false
      if (res.email && !emailOk) failures++
      console.log(`[notifications:test] ${emailOk ? '✅' : '❌'} ${s.name}`, {
        tookMs,
        inApp: res.inApp,
        email: res.email,
      })
    } catch (err) {
      failures++
      console.error(`[notifications:test] ❌ ${s.name} threw`, err)
    }
  }

  console.log('[notifications:test] done', {
    scenarios: scenarios(stamp).length,
    emailFailures: failures,
    note: hasResend
      ? `Check the "${user.email}" inbox (and spam) + the Resend dashboard → Emails tab.`
      : 'Emails were stubbed (no API key) — check the console output above.',
  })
  process.exit(failures > 0 ? 1 : 0)
}

main()
