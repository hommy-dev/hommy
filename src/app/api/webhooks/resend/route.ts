// Resend event webhook for recruitment emails. Bounces + complaints feed the
// email suppression list (so we never email them again) and mark the prospect;
// opens/clicks/delivered update outreach_status. The proxy bypasses
// /api/webhooks/* (public route).
//
// Auth: Resend signs with Svix, but to stay dependency-free we also accept a
// shared secret appended to the configured endpoint URL (?secret=...). If
// RESEND_WEBHOOK_SECRET is set, the secret must match.

import { type NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorProspects } from '@/lib/db/schema'
import { setEmailOptOut, normalizeEmail } from '@/lib/notifications/opt-out'

// Resend event type → our outreach_status. Suppression events also opt-out.
const STATUS_MAP: Record<string, string> = {
  'email.delivered': 'sent',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'suppressed',
}
const SUPPRESS: Record<string, string> = {
  'email.bounced': 'bounce',
  'email.complained': 'complaint',
}

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (secret) {
    const provided =
      new URL(req.url).searchParams.get('secret') ?? req.headers.get('x-webhook-secret') ?? ''
    if (provided !== secret) return new NextResponse('Invalid secret', { status: 401 })
  }

  let payload: { type?: string; data?: { to?: string[] | string; email?: string } }
  try {
    payload = await req.json()
  } catch {
    return new NextResponse('Bad JSON', { status: 400 })
  }

  const type = payload.type ?? ''
  const mapped = STATUS_MAP[type]
  const recipient = Array.isArray(payload.data?.to)
    ? payload.data?.to[0]
    : payload.data?.to ?? payload.data?.email
  if (!recipient || !mapped) return NextResponse.json({ ok: true, ignored: true })

  const email = normalizeEmail(recipient)
  try {
    if (SUPPRESS[type]) await setEmailOptOut(email, SUPPRESS[type])
    await db
      .update(contractorProspects)
      .set({ outreachStatus: mapped, updatedAt: new Date() })
      .where(eq(contractorProspects.email, email))
  } catch (err) {
    console.error('[resend webhook] update failed', err)
    return new NextResponse('Update error', { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
