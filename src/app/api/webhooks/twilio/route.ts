// Inbound Twilio SMS webhook — handles STOP/START opt-out keywords.
//
// Twilio's built-in Advanced Opt-Out already sends the confirmation reply and
// blocks at the carrier level; we ALSO record the opt-out here so our own
// sendNotification skips the number (and works the same if we ever switch
// providers). We respond with empty TwiML so Twilio owns the reply.
//
// Security: validate the X-Twilio-Signature so only Twilio can post here. The
// proxy already bypasses /api/webhooks/* (no auth), so this route is public.

import { type NextRequest } from 'next/server'
import { normalizeToE164 } from '@/lib/phone/e164'
import { setSmsOptOut } from '@/lib/notifications/opt-out'

const OPT_OUT_KEYWORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'])
const OPT_IN_KEYWORDS = new Set(['START', 'UNSTOP', 'YES'])

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

function twiml(body = EMPTY_TWIML): Response {
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/xml' } })
}

export async function POST(req: NextRequest): Promise<Response> {
  // Twilio posts application/x-www-form-urlencoded.
  const raw = await req.text()
  const params = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>

  // Validate the request actually came from Twilio (skipped in dev when no token).
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (authToken) {
    const signature = req.headers.get('x-twilio-signature') ?? ''
    const proto = req.headers.get('x-forwarded-proto') ?? 'https'
    const host = req.headers.get('host') ?? ''
    const url = `${proto}://${host}${new URL(req.url).pathname}`
    try {
      const twilioMod = await import('twilio')
      const validateRequest = (twilioMod.validateRequest ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (twilioMod as any).default?.validateRequest) as
        | ((token: string, sig: string, url: string, p: Record<string, string>) => boolean)
        | undefined
      if (validateRequest && !validateRequest(authToken, signature, url, params)) {
        return new Response('Invalid signature', { status: 401 })
      }
    } catch (err) {
      console.error('[twilio webhook] signature validation error', err)
      return new Response('Validation error', { status: 400 })
    }
  } else {
    console.warn('[twilio webhook] TWILIO_AUTH_TOKEN unset — skipping signature validation (dev)')
  }

  const from = normalizeToE164(params.From)
  const keyword = (params.Body ?? '').trim().toUpperCase().split(/\s+/)[0] ?? ''

  if (from) {
    if (OPT_OUT_KEYWORDS.has(keyword)) {
      await setSmsOptOut(from, true).catch((e) => console.error('[twilio webhook] opt-out failed', e))
    } else if (OPT_IN_KEYWORDS.has(keyword)) {
      await setSmsOptOut(from, false).catch((e) => console.error('[twilio webhook] opt-in failed', e))
    }
  }

  // Empty TwiML — let Twilio's built-in opt-out send the confirmation reply.
  return twiml()
}
