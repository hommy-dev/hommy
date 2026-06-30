// ============================================================
// Shared transactional-email layout — the SINGLE source of email UI.
//
// Every Hommy email (new lead, welcome, quote accepted, message digest,
// credit-purchase request, generic system notifications) is built on
// this layout so they all look like one product.
//
// Design = "Editorial" (chosen in the sandbox): white background, no
// card chrome, an indigo serif "Hommy" wordmark, a large serif heading,
// generous whitespace, and a solid indigo button.
//
// Email-safe: table layout + inline styles only. Web fonts don't load in
// most clients, so headings use a Georgia serif stack to echo the site's
// Sebenta serif, and body uses an Inter-led system stack. The brand is a
// text wordmark, not an image (clients block remote images by default).
// ============================================================

const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://www.hommy.online'

// --- Brand palette (mirrors globals.css; hardcoded because CSS vars and
//     Tailwind don't exist inside an email client) ---
export const EMAIL_COLORS = {
  page: '#ffffff',
  ink: '#0f1a0a', // near-black foreground
  muted: '#5c5c52', // warm gray body text
  faint: '#8a8a7e', // footer / meta
  border: '#e3dfd5', // warm hairline
  primary: '#1f00ce', // brand indigo
  primaryInk: '#ffffff',
  highlightBg: '#f6f3ec', // warm cream
} as const

const C = EMAIL_COLORS
const SERIF = "Georgia, 'Times New Roman', Times, serif"
const SANS =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

// ============================================================
// Content model — every structured email is described by this.
// ============================================================
export type EmailCta = { label: string; url: string }

export type EmailContent = {
  /** Hidden inbox-preview line (shown after the subject in most clients). */
  preheader?: string
  heading: string
  /** Lead paragraph. May contain simple <strong> (other HTML is escaped). */
  intro?: string
  paragraphs?: string[]
  /** A boxed key/value detail panel (job details, quote totals, …). */
  highlight?: { label?: string; rows: { label: string; value: string }[] }
  bullets?: { strong?: string; text: string }[]
  cta?: EmailCta
  /** Small print under the CTA. */
  note?: string
}

// ============================================================
// Helpers
// ============================================================
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Allow our own <strong> through, escape everything else.
function rich(s: string): string {
  return escapeHtml(s).replace(/&lt;(\/?strong)&gt;/g, '<$1>')
}

export function absoluteUrl(path: string): string {
  if (/^https?:/i.test(path)) return path
  return `${APP_URL.replace(/\/+$/, '')}${path.startsWith('/') ? '' : '/'}${path}`
}

function brandWordmark(): string {
  return `<span style="font-family:${SERIF};font-size:22px;font-weight:700;letter-spacing:-0.01em;color:${C.primary};">Hommy</span>`
}

/** Solid indigo button — text only (email clients render icons inconsistently). */
export function emailButton(cta: EmailCta): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 0;">
    <tr><td style="border-radius:8px;background:${C.primary};">
      <a href="${escapeHtml(absoluteUrl(cta.url))}" style="display:inline-block;padding:13px 24px;font-family:${SANS};font-size:15px;font-weight:600;line-height:1;color:${C.primaryInk};text-decoration:none;border-radius:8px;">${escapeHtml(cta.label)}</a>
    </td></tr>
  </table>`
}

function preheaderBlock(preheader?: string): string {
  if (!preheader) return ''
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(
    preheader,
  )}</div>`
}

// ============================================================
// The outer shell — wordmark, optional heading, raw body, footer.
// Use this directly for emails with bespoke bodies (e.g. the digest).
// ============================================================
export function emailShell(args: {
  preheader?: string
  heading?: string
  bodyHtml: string
}): string {
  const { preheader, heading, bodyHtml } = args
  const year = new Date().getFullYear()

  return `<!DOCTYPE html><html style="color-scheme:light dark;"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="light dark"/><meta name="supported-color-schemes" content="light dark"/></head>
  <body style="margin:0;padding:0;background:${C.page};">
    ${preheaderBlock(preheader)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.page};">
      <tr><td align="center" style="padding:40px 20px;">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:520px;width:100%;">
          <tr><td style="padding:0 0 24px;">${brandWordmark()}</td></tr>
          ${
            heading
              ? `<tr><td style="padding:0 0 18px;"><h1 style="margin:0;font-family:${SERIF};font-size:28px;font-weight:700;line-height:1.2;color:${C.ink};letter-spacing:-0.01em;">${escapeHtml(
                  heading,
                )}</h1></td></tr>`
              : ''
          }
          <tr><td style="padding:0;">${bodyHtml}</td></tr>
          <tr><td style="padding:36px 0 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid ${C.border};padding-top:16px;">
              <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.faint};">&copy; ${year} Hommy. You're receiving this because you have a Hommy account.</p>
            </td></tr></table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`
}

// ============================================================
// Structured body blocks → HTML
// ============================================================
function renderBlocks(c: EmailContent): string {
  const out: string[] = []

  if (c.intro) {
    out.push(
      `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.ink};">${rich(
        c.intro,
      )}</p>`,
    )
  }

  for (const p of c.paragraphs ?? []) {
    out.push(
      `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.muted};">${rich(
        p,
      )}</p>`,
    )
  }

  if (c.highlight) {
    const rows = c.highlight.rows
      .map(
        (r) => `
          <tr>
            <td style="padding:6px 0;font-family:${SANS};font-size:13px;color:${C.muted};">${escapeHtml(r.label)}</td>
            <td align="right" style="padding:6px 0;font-family:${SANS};font-size:14px;font-weight:600;color:${C.ink};">${escapeHtml(r.value)}</td>
          </tr>`,
      )
      .join('')
    out.push(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;background:${C.highlightBg};border:1px solid ${C.border};border-radius:8px;">
        <tr><td style="padding:14px 16px;">
          ${
            c.highlight.label
              ? `<p style="margin:0 0 6px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${C.faint};">${escapeHtml(c.highlight.label)}</p>`
              : ''
          }
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
        </td></tr>
      </table>`)
  }

  if (c.bullets) {
    const items = c.bullets
      .map(
        (b) => `
          <tr>
            <td valign="top" style="padding:0 10px 12px 0;font-family:${SANS};font-size:15px;line-height:1.5;color:${C.primary};">&bull;</td>
            <td valign="top" style="padding:0 0 12px;font-family:${SANS};font-size:15px;line-height:1.5;color:${C.muted};">${
              b.strong ? `<strong style="color:${C.ink};">${escapeHtml(b.strong)}</strong> ` : ''
            }${rich(b.text)}</td>
          </tr>`,
      )
      .join('')
    out.push(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">${items}</table>`,
    )
  }

  if (c.cta) out.push(emailButton(c.cta))

  if (c.note) {
    out.push(
      `<p style="margin:16px 0 0;font-family:${SANS};font-size:13px;line-height:1.5;color:${C.faint};">${rich(
        c.note,
      )}</p>`,
    )
  }

  return out.join('\n')
}

// ============================================================
// Public API — render a full email from the structured content model.
// ============================================================
export function renderEmail(c: EmailContent): string {
  return emailShell({
    preheader: c.preheader,
    heading: c.heading,
    bodyHtml: renderBlocks(c),
  })
}

// Shared font stacks, exported for bespoke templates (e.g. the digest) so
// they don't redefine the stacks and drift from this file.
export const EMAIL_FONTS = { serif: SERIF, sans: SANS } as const
