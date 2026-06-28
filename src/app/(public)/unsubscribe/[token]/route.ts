// One-click unsubscribe for recruitment emails. The link (and the
// List-Unsubscribe-Post header) point here with a signed token carrying the
// email. We record the opt-out so the email is never contacted again. GET shows
// a confirmation page; POST supports RFC 8058 one-click unsubscribe.

import { type NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractorProspects } from '@/lib/db/schema'
import { setEmailOptOut, normalizeEmail } from '@/lib/notifications/opt-out'
import { verifyUnsubscribeToken } from '@/lib/recruitment/invite'

async function suppress(token: string): Promise<boolean> {
  const email = verifyUnsubscribeToken(token)
  if (!email) return false
  const normalized = normalizeEmail(email)
  await setEmailOptOut(normalized, 'unsubscribe')
  await db
    .update(contractorProspects)
    .set({ outreachStatus: 'suppressed', updatedAt: new Date() })
    .where(eq(contractorProspects.email, normalized))
  return true
}

function page(message: string, ok: boolean): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head>
     <body style="font-family:Arial,Helvetica,sans-serif;background:#f6f6f4;color:#1a1a1a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
       <div style="max-width:440px;text-align:center;padding:32px">
         <h1 style="font-size:20px;margin:0 0 8px">${ok ? "You're unsubscribed" : 'Link expired'}</h1>
         <p style="color:#666;line-height:1.5">${message}</p>
       </div>
     </body></html>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html' } },
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params
  const ok = await suppress(token).catch(() => false)
  return page(
    ok
      ? "You won't receive any more emails from us. Sorry for the interruption."
      : 'This unsubscribe link is invalid or has expired.',
    ok,
  )
}

// One-click (RFC 8058): mail clients POST here without loading the page.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params
  await suppress(token).catch(() => false)
  return new NextResponse(null, { status: 200 })
}
