// Status webhook from the cold-email tool (Instantly/Smartlead). Maps delivery
// events back onto contractor_prospects.outreach_status and feeds bounces /
// unsubscribes / complaints into the email suppression list so we never
// re-export them. The proxy bypasses /api/webhooks/* (public route).
//
// Tools differ in payload shape, so we parse tolerantly (common field names) and
// gate on a shared secret. Exact signature scheme should match the chosen tool.

import { type NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorProspects } from '@/lib/db/schema'
import { setEmailOptOut, normalizeEmail } from '@/lib/notifications/opt-out'

// Tool event → our outreach_status. Suppression events also write email_opt_outs.
const STATUS_MAP: Record<string, string> = {
  sent: 'sent',
  email_sent: 'sent',
  opened: 'opened',
  email_opened: 'opened',
  clicked: 'clicked',
  link_clicked: 'clicked',
  replied: 'replied',
  reply_received: 'replied',
  bounced: 'bounced',
  email_bounced: 'bounced',
  unsubscribed: 'suppressed',
  complained: 'suppressed',
  spam_complaint: 'suppressed',
}
const SUPPRESS = new Set(['bounced', 'unsubscribed', 'complained', 'spam_complaint'])

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v) return v
  }
  return null
}

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.OUTREACH_WEBHOOK_SECRET
  if (secret) {
    const provided =
      req.headers.get('x-webhook-secret') ?? new URL(req.url).searchParams.get('secret') ?? ''
    if (provided !== secret) return new NextResponse('Invalid secret', { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = (await req.json()) as Record<string, unknown>
  } catch {
    return new NextResponse('Bad JSON', { status: 400 })
  }

  const rawEvent = (pick(payload, ['event_type', 'event', 'type']) ?? '').toLowerCase()
  const lead = (payload.lead as Record<string, unknown> | undefined) ?? payload
  const email = pick(lead, ['email', 'lead_email', 'to'])
  const mapped = STATUS_MAP[rawEvent]

  if (!email || !mapped) {
    // Unknown/irrelevant event — ack so the tool doesn't retry forever.
    return NextResponse.json({ ok: true, ignored: true })
  }

  const normalized = normalizeEmail(email)
  try {
    if (SUPPRESS.has(rawEvent)) {
      await setEmailOptOut(normalized, rawEvent === 'bounced' || rawEvent === 'email_bounced' ? 'bounce' : rawEvent.includes('complain') || rawEvent.includes('spam') ? 'complaint' : 'unsubscribe')
    }
    await db
      .update(contractorProspects)
      .set({ outreachStatus: mapped, updatedAt: new Date() })
      .where(eq(contractorProspects.email, normalized))
  } catch (err) {
    console.error('[outreach webhook] update failed', err)
    return new NextResponse('Update error', { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
