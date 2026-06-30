// Cold recruitment email - SEPARATE from the transactional sender in `email.ts`.
// Sent via Resend but from a DIFFERENT domain (RECRUITMENT_FROM_EMAIL, e.g. the
// outreach.hommy.online subdomain) so cold outreach can never hurt the
// reputation of the transactional hommy.online domain. CAN-SPAM compliant: a real
// reply-to, a physical mailing address, and a working unsubscribe (link +
// List-Unsubscribe header for one-click). No-ops to a log when RESEND_API_KEY is
// unset (dev).
//
// The copy is written to read like a founder typed it, not a blast: short, plain,
// first-name signed, varied per prospect (company name, city, Google rating), and
// different on the follow-up vs the first touch. We send a plaintext part too,
// which both helps deliverability and is how a real person's email actually looks.

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
// Who the email is signed by. Set RECRUITMENT_SIGNER_NAME to a real first name so
// it reads as a person, not a brand. Falls back to the from-name.
const SIGNER = process.env.RECRUITMENT_SIGNER_NAME || FROM_NAME
// When the signer IS the brand (no real name set), we avoid signing "Hommy /
// Hommy" and avoid the awkward "I'm Hommy, I run Hommy" intro.
const SIGNER_IS_BRAND = SIGNER.trim().toLowerCase() === FROM_NAME.trim().toLowerCase()

// Claim links in cold emails must point at the PUBLIC site, never localhost
// NEXT_PUBLIC_SITE_URL so links stay correct even when discovery runs
// from a local script.
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hommy.online'

// SAFETY VALVE for end-to-end testing. When set, EVERY recruitment email is
// redirected to this address instead of the real prospect, and the intended
// recipient is shown in the subject. Leave UNSET in production — a real value
// here silently reroutes all outreach. Never email a real contractor in a test.
const TEST_REDIRECT = process.env.RECRUITMENT_TEST_REDIRECT?.trim() || ''

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
  /** Google rating, if we have it (decimal string e.g. "4.80"). Used as a personal touch. */
  rating?: string | null
  /** True when this isn't the prospect's first email (a later job in their area). */
  isFollowUp?: boolean
}

// Stable per-prospect seed so phrasing varies between prospects but stays the
// same for a given one. Keeps the outreach from having one templated footprint.
function seedFrom(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

type Copy = { subject: string; greeting: string; lines: string[] }

// Copy is written to read like a 1:1 note a founder typed — NOT a marketing
// blast. Deliberately plain so Gmail files it under Primary, not Promotions: no
// styled button, no marketing lexicon, one bare link (the job). The single
// outbound link is the claim URL, embedded inline in a body line.
function buildCopy(v: RecruitmentEmailVars): Copy {
  const seed = seedFrom(v.to)
  const where = v.city?.trim() || 'your area'
  const company = v.companyName?.trim() || null
  const greeting = company ? `Hi ${company},` : 'Hey there,'
  const ratingNum = v.rating != null ? Number(v.rating) : NaN
  // A genuine "I looked you up" line, only when we actually have a good rating.
  const ratingLine =
    Number.isFinite(ratingNum) && ratingNum >= 4
      ? pick(
          [
            `Found you on Google, ${ratingNum.toFixed(1)} stars, so you're exactly who I'd want on it.`,
            `Your ${ratingNum.toFixed(1)} on Google is why I'm reaching out to you specifically.`,
          ],
          seed,
        )
      : null

  if (v.isFollowUp) {
    const subject = pick(
      [`another roofing job in ${where}`, `${where} again`, `one more near you`],
      seed,
    )
    const lines = [
      `Me again — another homeowner in ${where} just posted a roofing job and still no one's covering it.`,
      `Same as before: free to look, you only pay if a homeowner accepts your quote. Here it is: ${v.claimUrl}`,
      `If it's not for you, no worries — there's an unsubscribe link below and I won't email again.`,
    ]
    return { subject, greeting, lines }
  }

  const subject = pick(
    [`roofing job in ${where}`, `quick one about ${where}`, `${where} — homeowner needs a roofer`],
    seed,
  )
  const lines = [
    SIGNER_IS_BRAND
      ? `I run Hommy — we connect homeowners with local roofers.`
      : `I'm ${SIGNER}, I run Hommy (we connect homeowners with local roofers).`,
    `A homeowner in ${where} just posted a roofing job and we don't have anyone covering that area yet, so it's sitting unclaimed.`,
    ...(ratingLine ? [ratingLine] : []),
    `No subscription, nothing to pay to be listed. You'd only pay a small fee if a homeowner accepts your quote. New accounts start with some credit too, so the first few jobs will cost you nothing.`,
    `If you want a look, here's the job: ${v.claimUrl}`,
  ]
  return { subject, greeting, lines }
}

function renderHtml(v: RecruitmentEmailVars, c: Copy): string {
  // The HTML version shows a tasteful CTA button for the claim URL; the line that
  // carried the inline URL becomes its lead-in text + the button. The plaintext
  // part (renderText) keeps the bare URL, so the link works either way ("both").
  const cta = v.isFollowUp ? 'See the jobs' : 'See the job'
  const button =
    `<p style="margin:4px 0 18px">` +
    `<a href="${v.claimUrl}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px">${cta}</a>` +
    `</p>`
  const body = c.lines
    .map((l) => {
      if (l.includes(v.claimUrl)) {
        const lead = escapeHtml(l.split(v.claimUrl)[0].replace(/[:\s]+$/, '').trim())
        return (lead ? `<p style="margin:0 0 4px">${lead}</p>` : '') + button
      }
      return `<p style="margin:0 0 12px">${escapeHtml(l)}</p>`
    })
    .join('')
  return `<!doctype html><html><body>
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;line-height:1.5;color:#222">
    <p style="margin:0 0 12px">${escapeHtml(c.greeting)}</p>
    ${body}
    <p style="margin:16px 0 0">${SIGNER_IS_BRAND ? 'Hommy' : `${escapeHtml(SIGNER)}<br/>Hommy`}</p>
    <p style="margin:18px 0 0;font-size:12px;color:#888">
      You're getting this because ${escapeHtml(v.companyName?.trim() || 'your company')} is listed publicly as a roofer.${MAILING_ADDRESS ? ` Hommy, ${escapeHtml(MAILING_ADDRESS)}.` : ''}<br/>
      <a href="${v.unsubscribeUrl}" style="color:#888">Unsubscribe</a>
    </p>
  </div></body></html>`
}

function renderText(v: RecruitmentEmailVars, c: Copy): string {
  const footer = [
    `You're getting this because ${v.companyName?.trim() || 'your company'} is listed publicly as a roofer.`,
    MAILING_ADDRESS ? `Hommy, ${MAILING_ADDRESS}.` : '',
    `Unsubscribe: ${v.unsubscribeUrl}`,
  ]
    .filter(Boolean)
    .join('\n')
  // The claim URL is already inline in c.lines, so the text part has exactly one link.
  const signoff = SIGNER_IS_BRAND ? ['Hommy'] : [SIGNER, 'Hommy']
  return [c.greeting, '', ...c.lines, '', ...signoff, '', footer].join('\n')
}

/** Send one recruitment email. Returns ok=false on any failure (caller leaves
 *  the prospect eligible so it retries). */
export async function sendRecruitmentEmail(
  v: RecruitmentEmailVars,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  if (!recruitmentEmailConfigured()) {
    console.log(`[recruitment-email stub] To: ${v.to} (RESEND/RECRUITMENT_FROM_EMAIL not set)`)
    return { ok: false, error: 'recruitment email not configured' }
  }
  const copy = buildCopy(v)
  // Test redirect: reroute to the test inbox and flag the intended recipient.
  const to = TEST_REDIRECT || v.to
  const subject = TEST_REDIRECT ? `[TEST → ${v.to}] ${copy.subject}` : copy.subject
  if (TEST_REDIRECT) console.log(`[recruitment-email] TEST redirect: ${v.to} → ${to}`)
  try {
    // DELIVERABILITY: keep open/click tracking OFF for the recruitment domain
    // (Resend dashboard → Domains → tracking). The tracking pixel + rewritten
    // links are a strong "this is marketing" signal that pushes mail to Gmail
    // Promotions. Tracking is a domain-level setting, not a per-send flag here.
    // Resend does NOT throw on API errors - it returns them in `error`. Check it.
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: REPLY_TO || undefined,
      subject,
      html: renderHtml(v, copy),
      text: renderText(v, copy),
      headers: {
        // One-click unsubscribe (RFC 8058) - protects deliverability.
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
