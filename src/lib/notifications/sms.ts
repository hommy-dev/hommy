// SMS — provider-agnostic. Picks whichever provider is configured via env (in
// priority order) and falls back to a logging no-op when none are set, so the
// rest of the notification pipeline keeps working with zero SMS config.
//
// EASIEST / CHEAPEST to start: Textbelt (set TEXTBELT_KEY).
//   - No account signup wall, no phone-number provisioning, works worldwide.
//   - Test for FREE right now with TEXTBELT_KEY=textbelt (1 SMS/day).
//   - For production buy a pay-as-you-go quota key (no monthly fee) — cheaper
//     and far less setup than Twilio/Plivo.
// Also supported: Plivo (PLIVO_*), Twilio (TWILIO_*).
// For high volume later, AWS SNS is the cheapest reliable option.

type SmsResult = { success: boolean; error?: string }

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const text = body.length > 1000 ? body.slice(0, 997) + '…' : body

  if (process.env.TEXTBELT_KEY) {
    return sendViaTextbelt(to, text)
  }
  if (process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN && process.env.PLIVO_SENDER_ID) {
    return sendViaPlivo(to, text)
  }
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

// ---- Textbelt (https://textbelt.com) — simple HTTP, no SDK ----
async function sendViaTextbelt(to: string, text: string): Promise<SmsResult> {
  try {
    const res = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ phone: to, message: text, key: process.env.TEXTBELT_KEY! }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean
      error?: string
      quotaRemaining?: number
    }
    if (!data.success) {
      console.error('[sendSms] Textbelt failed', data.error)
      return { success: false, error: data.error ?? 'textbelt failed' }
    }
    return { success: true }
  } catch (err) {
    console.error('[sendSms] Textbelt error', err)
    return { success: false, error: String(err) }
  }
}

// ---- Plivo (REST, no SDK). Destination wants digits only ----
async function sendViaPlivo(to: string, text: string): Promise<SmsResult> {
  const authId = process.env.PLIVO_AUTH_ID!
  const authToken = process.env.PLIVO_AUTH_TOKEN!
  const sender = process.env.PLIVO_SENDER_ID!
  const dst = to.replace(/[^\d]/g, '')
  if (!dst) return { success: false, error: 'invalid destination number' }

  const auth = Buffer.from(`${authId}:${authToken}`).toString('base64')
  try {
    const res = await fetch(`https://api.plivo.com/v1/Account/${authId}/Message/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({ src: sender, dst, text }),
    })
    if (res.status !== 202 && res.status !== 200) {
      const detail = await res.text().catch(() => '')
      console.error('[sendSms] Plivo non-ok', { status: res.status, detail: detail.slice(0, 300) })
      return { success: false, error: `plivo ${res.status}` }
    }
    return { success: true }
  } catch (err) {
    console.error('[sendSms] Plivo error', err)
    return { success: false, error: String(err) }
  }
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
