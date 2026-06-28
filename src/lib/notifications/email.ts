import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// The inbox display name (what Gmail etc. show as the sender). Without it, mail
// clients fall back to the address's local part (e.g. "notifications").
const FROM_NAME = process.env.NEXT_PUBLIC_FROM_NAME ?? 'Hommy'
const FROM_EMAIL = process.env.NEXT_PUBLIC_FROM_EMAIL ?? 'notifications@hommy.online'
// If the env value already carries a display name (contains "<"), use it as-is;
// otherwise prepend the brand name so it reads "Hommy <address>".
const FROM = FROM_EMAIL.includes('<') ? FROM_EMAIL : `${FROM_NAME} <${FROM_EMAIL}>`

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
    // Resend does NOT throw on API errors (unverified domain, invalid recipient,
    // test-mode restriction, …) — it returns them in `error`. We must check it,
    // or every caller falsely believes the email was sent.
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      ...(attachments?.length ? { attachments } : {}),
    })
    if (error) {
      console.error('[sendEmail] Resend error', error)
      return { success: false, error: error.message ?? JSON.stringify(error) }
    }
    return { success: true }
  } catch (err) {
    console.error('[sendEmail] Resend threw', err)
    return { success: false, error: String(err) }
  }
}
