import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.NEXT_PUBLIC_FROM_EMAIL ?? 'notifications@homei.com'

/**
 * A file to attach. Provide EITHER `path` (a hosted URL Resend fetches — e.g. a
 * Cloudinary `secure_url`) OR `content` (raw bytes / base64). `filename` is what
 * the recipient sees.
 */
export type EmailAttachment = {
  filename: string
  path?: string
  content?: Buffer | string
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[]
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email stub] To: ${to} | Subject: ${subject}`)
    return { success: true }
  }
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      ...(attachments?.length ? { attachments } : {}),
    })
    return { success: true }
  } catch (err) {
    console.error('[sendEmail] Resend error', err)
    return { success: false, error: String(err) }
  }
}
