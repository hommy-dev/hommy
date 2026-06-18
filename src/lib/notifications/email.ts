import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.NEXT_PUBLIC_FROM_EMAIL ?? 'notifications@homei.com'

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email stub] To: ${to} | Subject: ${subject}`)
    return { success: true }
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
    return { success: true }
  } catch (err) {
    console.error('[sendEmail] Resend error', err)
    return { success: false, error: String(err) }
  }
}
