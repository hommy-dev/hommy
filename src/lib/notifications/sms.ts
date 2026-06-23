// SMS — Twilio only. Sends via Twilio when configured, and falls back to a
// logging no-op when the Twilio env vars are absent, so the rest of the
// notification pipeline keeps working with zero SMS config (dev/test).

type SmsResult = { success: boolean; error?: string }

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const text = body.length > 1000 ? body.slice(0, 997) + '…' : body

  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    // A single from-number works for one country; a Messaging Service SID is the
    // multi-country path (Twilio picks the best sender per recipient). Either one enables Twilio.
    (process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID)
  ) {
    return sendViaTwilio(to, text)
  }

  console.log(`[SMS stub] To: ${to} | Body: ${text}`)
  return { success: true }
}

// ---- Twilio (SDK lazy-loaded so it stays out of the bundle unless used) ----
async function sendViaTwilio(to: string, text: string): Promise<SmsResult> {
  try {
    const twilio = (await import('twilio')).default
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
    // Prefer a Messaging Service (multi-country, sender pool) when configured;
    // otherwise fall back to the single from-number.
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
    await client.messages.create(
      messagingServiceSid
        ? { to, body: text, messagingServiceSid }
        : { to, body: text, from: process.env.TWILIO_PHONE_NUMBER! },
    )
    return { success: true }
  } catch (err) {
    console.error('[sendSms] Twilio error', err)
    return { success: false, error: String(err) }
  }
}
