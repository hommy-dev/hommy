// Adapter to the dedicated cold-email tool (Instantly by default). The app owns
// discovery + verified prospects + claim links; the tool owns warmup, sending,
// and tracking. This isolates the vendor so swapping (Instantly ↔ Smartlead) is
// a one-file change. No-ops cleanly when unconfigured (returns ok:false) so the
// pipeline never throws in dev.
//
// Instantly v2: POST https://api.instantly.ai/api/v2/leads  (Bearer key) adds a
// lead to a campaign with custom variables we template into the email/links.

const API_KEY = process.env.OUTREACH_TOOL_API_KEY ?? ''
const CAMPAIGN_ID = process.env.OUTREACH_CAMPAIGN_ID ?? ''
const BASE = process.env.OUTREACH_TOOL_BASE ?? 'https://api.instantly.ai/api/v2'

export type OutreachLead = {
  email: string
  companyName: string | null
  firstName?: string | null
  city: string | null
  state: string | null
  /** Absolute /claim/<token> URL the email CTA points at. */
  claimUrl: string
}

export function outreachConfigured(): boolean {
  return !!API_KEY && !!CAMPAIGN_ID
}

/** Push one lead into the cold-email campaign. Returns ok=false on any failure
 *  (caller leaves the prospect unexported so it retries next run). */
export async function addOutreachLead(
  lead: OutreachLead,
): Promise<{ ok: boolean; error?: string }> {
  if (!outreachConfigured()) {
    return { ok: false, error: 'outreach tool not configured' }
  }
  try {
    const res = await fetch(`${BASE}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        campaign: CAMPAIGN_ID,
        email: lead.email,
        company_name: lead.companyName ?? undefined,
        first_name: lead.firstName ?? undefined,
        // Custom variables the campaign template can merge: {{claim_url}} etc.
        custom_variables: {
          claim_url: lead.claimUrl,
          city: lead.city ?? '',
          state: lead.state ?? '',
        },
      }),
    })
    if (!res.ok) {
      return { ok: false, error: `${res.status} ${await res.text().catch(() => '')}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
