// ============================================================
// Messages-digest email template.
//
// One email per recipient summarizing every unread MESSAGE notification
// older than 15 min. Up to 5 conversations are listed; overflow shows
// "+ N more conversations". Each row links to the conversation.
// ============================================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://homei.com'

export type DigestConversationRow = {
  conversationId: string
  /** Where the recipient should land. e.g. /homeowner/messages/{id} */
  actionUrl: string
  /** Display name of the other party. */
  peerName: string
  /** 1-line preview of the most recent unread message. */
  latestPreview: string
  /** Number of unread messages from this conversation in this digest window. */
  unreadCount: number
}

const MAX_ROWS = 5

export function renderMessagesDigestEmail(args: {
  recipientName: string
  conversations: DigestConversationRow[]
  totalConversations: number
  totalUnread: number
}): { subject: string; html: string } {
  const { recipientName, conversations, totalConversations, totalUnread } = args
  const visible = conversations.slice(0, MAX_ROWS)
  const overflow = totalConversations - visible.length

  const subject =
    totalUnread === 1
      ? 'You have 1 new message on Homei'
      : `You have ${totalUnread} new messages on Homei`

  const rowsHtml = visible
    .map((c) => {
      const fullUrl = absolute(c.actionUrl)
      return `
        <tr>
          <td style="padding:14px 0;border-top:1px solid #ececec;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:0;">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111827;">
                    ${escapeHtml(c.peerName)}
                    ${
                      c.unreadCount > 1
                        ? `<span style="display:inline-block;margin-left:6px;padding:1px 7px;border-radius:9999px;background:#ede9fe;color:#6c47ff;font-size:11px;font-weight:600;">${c.unreadCount}</span>`
                        : ''
                    }
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.4;color:#4b5563;">
                    ${escapeHtml(truncate(c.latestPreview, 140))}
                  </p>
                </td>
                <td align="right" style="padding-left:12px;vertical-align:top;">
                  <a href="${fullUrl}" style="display:inline-block;padding:7px 14px;background:#6c47ff;color:#fff;text-decoration:none;border-radius:6px;font-size:12px;font-weight:600;">Open</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
    })
    .join('')

  const overflowHtml =
    overflow > 0
      ? `
          <tr>
            <td style="padding:14px 0;border-top:1px solid #ececec;text-align:center;">
              <a href="${absolute('/')}" style="font-size:13px;color:#6c47ff;text-decoration:none;">
                + ${overflow} more conversation${overflow === 1 ? '' : 's'} →
              </a>
            </td>
          </tr>
        `
      : ''

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f5f5f7;">
          <tr>
            <td align="center" style="padding:32px 12px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:600px;background:#ffffff;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <tr>
                  <td style="padding:28px 28px 20px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6c47ff;">
                      Homei
                    </p>
                    <h1 style="margin:0;font-size:20px;font-weight:600;color:#111827;line-height:1.3;">
                      Hi ${escapeHtml(recipientName.split(' ')[0] || 'there')}, you missed ${
                        totalUnread === 1 ? 'a message' : `${totalUnread} messages`
                      } while you were away.
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      ${rowsHtml}
                      ${overflowHtml}
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 28px 28px;">
                    <p style="margin:0;font-size:11px;line-height:1.5;color:#9ca3af;">
                      You're receiving this digest because you have unread messages on Homei.
                      We send digests at most once every 15 minutes when you're away.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  return { subject, html }
}

function absolute(path: string): string {
  if (path.startsWith('http')) return path
  return `${APP_URL.replace(/\/+$/, '')}${path.startsWith('/') ? '' : '/'}${path}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + '…'
}
