/**
 * Smoke-test the Resend integration end-to-end.
 *
 * Usage:
 *   pnpm email:test -- --to=you@example.com
 *   pnpm email:test -- --to=you@example.com --subject="Hi" --body="<h1>Hey</h1>"
 *
 * The script reports:
 *   • whether RESEND_API_KEY and FROM_EMAIL are set
 *   • whether Resend returns an id (success) or an error (failure)
 *   • the raw Resend response so domain/verification issues are obvious
 *
 * Common failures to look for in the output:
 *   • "The from address is not a verified sender" → verify the FROM domain in the Resend dashboard
 *   • "API key is invalid" → wrong RESEND_API_KEY in .env
 *   • "You can only send testing emails to your own email address" → free-tier limit, send to the email you signed up with
 */

import 'dotenv/config'
import { Resend } from 'resend'

type Args = { to?: string; subject?: string; body?: string }

function parseArgs(argv: string[]): Args {
  const out: Args = {}
  for (const arg of argv) {
    if (arg.startsWith('--to=')) out.to = arg.slice('--to='.length)
    else if (arg.startsWith('--subject=')) out.subject = arg.slice('--subject='.length)
    else if (arg.startsWith('--body=')) out.body = arg.slice('--body='.length)
  }
  return out
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const to = args.to ?? process.env.TEST_EMAIL_TO?.trim()
  const subject = args.subject ?? 'RoofLink Resend smoke test'
  const html =
    args.body ??
    `<div style="font-family: Inter, system-ui, sans-serif; padding: 24px;">
      <h1 style="margin: 0 0 12px; font-size: 20px;">✅ Resend is working</h1>
      <p style="color: #475569; line-height: 1.6;">
        This email was dispatched by <code>scripts/test-email.ts</code>.
      </p>
      <p style="color: #64748b; font-size: 12px;">
        Sent at: ${new Date().toISOString()}
      </p>
    </div>`

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.FROM_EMAIL ?? 'notifications@rooflink.com'

  console.log('[email:test] config', {
    hasApiKey: Boolean(apiKey),
    apiKeyPrefix: apiKey ? apiKey.slice(0, 5) + '…' : null,
    from,
    to,
  })

  if (!apiKey) {
    console.error(
      '[email:test] RESEND_API_KEY is not set. Without it, src/lib/notifications/email.ts falls back to a stub that only logs.',
    )
    process.exit(1)
  }

  if (!to) {
    console.error(
      '[email:test] Missing recipient. Pass --to=you@example.com or set TEST_EMAIL_TO in .env',
    )
    process.exit(1)
  }

  const resend = new Resend(apiKey)

  console.log('[email:test] sending…')
  const t0 = Date.now()
  try {
    const res = await resend.emails.send({
      from,
      to,
      subject,
      html,
    })

    const tookMs = Date.now() - t0

    if (res.error) {
      console.error('[email:test] FAILED', {
        tookMs,
        error: res.error,
      })
      process.exit(1)
    }

    console.log('[email:test] OK', {
      tookMs,
      messageId: res.data?.id,
    })
    console.log(
      `[email:test] check the "${to}" inbox (and spam) plus the Resend dashboard → Emails tab.`,
    )
    process.exit(0)
  } catch (err) {
    console.error('[email:test] threw', {
      tookMs: Date.now() - t0,
      err,
    })
    process.exit(1)
  }
}

main()
