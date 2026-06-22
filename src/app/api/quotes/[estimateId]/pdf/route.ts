// On-demand branded quote PDF. Two ways to authorize:
//   1. A signed-in participant of the project's conversation (homeowner or a
//      member of the owning company) — same rule as the in-chat "View quote".
//   2. A matching `?token=` (the emailed accept link's capability), so the
//      public /accept/[token] page can offer a download without a session.
// Runs on the Node runtime (default) — @react-pdf/renderer needs it.

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadQuoteForPdf } from '@/lib/data/quote-pdf-data'
import { renderQuotePdf } from '@/lib/pdf/quote-pdf'
import { deriveQuoteNumber } from '@/components/quote/quote-document'
import { getProjectConversationId } from '@/lib/messaging/system'
import { getConversationForUser } from '@/lib/data/conversations'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ estimateId: string }> },
) {
  const { estimateId } = await params

  const loaded = await loadQuoteForPdf(estimateId)
  if (!loaded) {
    return new Response('Not found', { status: 404 })
  }

  const authorized = await authorize(req, loaded.projectId, loaded.acceptToken)
  if (!authorized) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const pdf = await renderQuotePdf(loaded.data)
    const quoteNumber = deriveQuoteNumber(loaded.data.estimateId, loaded.data.issuedAt)
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${quoteNumber}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[quotes/pdf] render failed', err)
    return new Response('Could not generate PDF', { status: 500 })
  }
}

async function authorize(
  req: NextRequest,
  projectId: string,
  acceptToken: string | null,
): Promise<boolean> {
  // Token path — possession of the accept token authorizes (public email link).
  const token = req.nextUrl.searchParams.get('token')
  if (token && acceptToken && token === acceptToken) return true

  // Session path — must be a participant of the project's conversation.
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return false

  const conversationId = await getProjectConversationId(projectId)
  if (!conversationId) return false
  const convo = await getConversationForUser(conversationId, userId)
  return !!convo
}
