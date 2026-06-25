// ============================================================
// Messages-digest email template.
//
// One email per recipient summarizing every unread MESSAGE notification
// older than 15 min. Up to 5 conversations are listed; overflow shows
// "+ N more conversations". Each row links to the conversation.
//
// Built on the shared email layout (emailShell) so it matches every
// other Hommy email — see ./template.ts.
// ============================================================

import {
  emailShell,
  emailButton,
  absoluteUrl,
  escapeHtml,
  EMAIL_COLORS as C,
  EMAIL_FONTS as F,
} from './template'

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
      ? 'You have 1 new message on Hommy'
      : `You have ${totalUnread} new messages on Hommy`

  const firstName = recipientName.split(' ')[0] || 'there'
  const heading =
    totalUnread === 1
      ? `Hi ${firstName}, you missed a message while you were away.`
      : `Hi ${firstName}, you missed ${totalUnread} messages while you were away.`

  const rowsHtml = visible
    .map((c) => {
      const fullUrl = absoluteUrl(c.actionUrl)
      return `
        <tr>
          <td style="padding:14px 0;border-top:1px solid ${C.border};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:0;">
                  <p style="margin:0 0 4px;font-family:${F.sans};font-size:14px;font-weight:600;color:${C.ink};">
                    ${escapeHtml(c.peerName)}
                    ${
                      c.unreadCount > 1
                        ? `<span style="display:inline-block;margin-left:6px;padding:1px 7px;border-radius:9999px;background:${C.highlightBg};color:${C.primary};font-size:11px;font-weight:700;">${c.unreadCount}</span>`
                        : ''
                    }
                  </p>
                  <p style="margin:0;font-family:${F.sans};font-size:13px;line-height:1.4;color:${C.muted};">
                    ${escapeHtml(truncate(c.latestPreview, 140))}
                  </p>
                </td>
                <td align="right" style="padding-left:12px;vertical-align:top;">
                  <a href="${fullUrl}" style="display:inline-block;padding:7px 14px;background:${C.primary};color:${C.primaryInk};text-decoration:none;border-radius:6px;font-family:${F.sans};font-size:12px;font-weight:600;">Open</a>
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
            <td style="padding:14px 0;border-top:1px solid ${C.border};text-align:center;">
              <a href="${absoluteUrl('/')}" style="font-family:${F.sans};font-size:13px;color:${C.primary};text-decoration:none;font-weight:600;">
                + ${overflow} more conversation${overflow === 1 ? '' : 's'}
              </a>
            </td>
          </tr>
        `
      : ''

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rowsHtml}
      ${overflowHtml}
    </table>
    ${emailButton({ label: 'Open Hommy', url: '/' })}
  `

  const html = emailShell({
    preheader: `${totalUnread} unread message${totalUnread === 1 ? '' : 's'} waiting for you on Hommy.`,
    heading,
    bodyHtml,
  })

  return { subject, html }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + '…'
}
