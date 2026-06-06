// SMS via Plivo (Homei uses Plivo, not Twilio — see AGENTS.md / HOMEI_PLATFORM.md §7).
//
// Uses Plivo's REST API directly via fetch — no SDK dependency. If the Plivo
// env vars are absent (e.g. local dev before an account is set up) this no-ops
// and logs, exactly like the email/push stubs, so the rest of the notification
// pipeline keeps working.
//
// Required env: PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, PLIVO_SENDER_ID.

export async function sendSms(
  to: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  const authId = process.env.PLIVO_AUTH_ID
  const authToken = process.env.PLIVO_AUTH_TOKEN
  const sender = process.env.PLIVO_SENDER_ID

  if (!authId || !authToken || !sender) {
    console.log(`[SMS stub] To: ${to} | Body: ${body}`)
    return { success: true }
  }

  // Plivo expects digits only for the destination (international format, no '+').
  const dst = to.replace(/[^\d]/g, '')
  if (!dst) return { success: false, error: 'invalid destination number' }

  const text = body.length > 1000 ? body.slice(0, 997) + '…' : body
  const auth = Buffer.from(`${authId}:${authToken}`).toString('base64')

  try {
    const res = await fetch(
      `https://api.plivo.com/v1/Account/${authId}/Message/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({ src: sender, dst, text }),
      },
    )
    // Plivo returns 202 Accepted when the message is queued.
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
