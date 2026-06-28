// Cold recruitment email — SEPARATE from the transactional sender in `email.ts`.
// Sent via Resend but from a DIFFERENT domain (RECRUITMENT_FROM_EMAIL, e.g. the
// outreach.hommy.online subdomain) so cold outreach can never hurt the
// reputation of the transactional hommy.online domain. CAN-SPAM compliant: a real reply-to, a
// physical mailing address, and a working unsubscribe (link + List-Unsubscribe
// header for one-click). No-ops to a log when RESEND_API_KEY is unset (dev).

import { Resend } from 'resend'

// The recruitment subdomain lives in a SEPARATE Resend account (free plan = 1
// domain per account), so it needs its OWN key. Fall back to the main key only
// if a dedicated one isn't set (e.g. once both domains live in one account).
const RECRUITMENT_KEY = process.env.RECRUITMENT_RESEND_API_KEY || process.env.RESEND_API_KEY
const resend = new Resend(RECRUITMENT_KEY)

const FROM_NAME = process.env.RECRUITMENT_FROM_NAME ?? 'Hommy'
const FROM_EMAIL = process.env.RECRUITMENT_FROM_EMAIL ?? ''
const REPLY_TO = process.env.RECRUITMENT_REPLY_TO || FROM_EMAIL
const MAILING_ADDRESS = process.env.RECRUITMENT_MAILING_ADDRESS ?? ''
const FROM = FROM_EMAIL.includes('<') ? FROM_EMAIL : `${FROM_NAME} <${FROM_EMAIL}>`

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

/** True when the recruitment sender is configured (key + separate FROM domain). */
export function recruitmentEmailConfigured(): boolean {
  return !!RECRUITMENT_KEY && !!FROM_EMAIL
}

export type RecruitmentEmailVars = {
  to: string
  companyName: string | null
  city: string | null
  claimUrl: string
  unsubscribeUrl: string
}

/**
 * Build the cold email body. Honest pitch from docs/launch-campaign.md ($300
 * credits = the existing signup grant). CAN-SPAM footer with address + unsubscribe.
 */
function renderRecruitmentHtml(v: RecruitmentEmailVars): string {
  const hi = v.companyName ? `Hi ${escapeHtml(v.companyName)},` : 'Hi there,'
  const where = v.city ? ` in ${escapeHtml(v.city)}` : ' in your area'
  return `<!doctype html><html><body style="margin:0;background:#f6f6f4;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <p style="font-size:16px;line-height:1.5">${hi}</p>
    <p style="font-size:16px;line-height:1.5">A homeowner${where} just posted a roofing job on Hommy, and there's no roofer covering that area on the platform yet.</p>
    <p style="font-size:16px;line-height:1.5">Hommy is different from Angi or HomeAdvisor: jobs come to you <strong>free to receive and view</strong>. It's just <strong>1 credit ($1) to start a conversation</strong>, and you only pay a real fee <strong>when you win the job</strong> — when the homeowner accepts your quote. No monthly fee, no paying to be considered.</p>
    <p style="font-size:16px;line-height:1.5">Claim your free verified profile and you'll get <strong>$300 in free credits</strong> to start, enough to win several jobs before you spend a dollar.</p>
    <p style="margin:28px 0">
      <a href="${v.claimUrl}" style="background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;font-size:16px">Claim your profile</a>
    </p>
    <p style="font-size:14px;color:#666;line-height:1.5">— The Hommy team</p>
    <hr style="border:none;border-top:1px solid #e2e2dd;margin:24px 0" />
    <p style="font-size:12px;color:#999;line-height:1.5">
      You're receiving this as a roofing contractor whose business is listed publicly online.
      ${MAILING_ADDRESS ? `Hommy · ${escapeHtml(MAILING_ADDRESS)}<br/>` : ''}
      Not interested? <a href="${v.unsubscribeUrl}" style="color:#999">Unsubscribe</a>.
    </p>
  </div></body></html>`
}

const SUBJECT = 'You only pay when you win the job'

/** Send one recruitment email. Returns ok=false on any failure (caller leaves
 *  the prospect pending so it retries). */
export async function sendRecruitmentEmail(
  v: RecruitmentEmailVars,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  if (!recruitmentEmailConfigured()) {
    console.log(`[recruitment-email stub] To: ${v.to} (RESEND/RECRUITMENT_FROM_EMAIL not set)`)
    return { ok: false, error: 'recruitment email not configured' }
  }
  try {
    // Resend does NOT throw on API errors — it returns them in `error`. Check it.
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: v.to,
      replyTo: REPLY_TO || undefined,
      subject: SUBJECT,
      html: renderRecruitmentHtml(v),
      headers: {
        // One-click unsubscribe (RFC 8058) — protects deliverability.
        'List-Unsubscribe': `<${v.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })
    if (error) {
      console.error('[recruitment-email] resend error', error)
      return { ok: false, error: error.message ?? JSON.stringify(error) }
    }
    return { ok: true, id: data?.id }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export function appUrl(): string {
  return APP_URL
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  )
}
