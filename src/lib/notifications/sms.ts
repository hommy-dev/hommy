import twilio from 'twilio'

export async function sendSms(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_PHONE_NUMBER
  ) {
    console.log(`[SMS stub] To: ${to} | Body: ${body}`)
    return { success: true }
  }
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
    await client.messages.create({
      body: body.length > 160 ? body.slice(0, 157) + '…' : body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    })
    return { success: true }
  } catch (err) {
    console.error('[sendSms] Twilio error', err)
    return { success: false, error: String(err) }
  }
}
