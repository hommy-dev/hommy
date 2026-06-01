/**
 * Server-to-channel broadcast helper.
 * Hits Supabase Realtime's REST endpoint with the service role key so the
 * server can push a message to every subscriber of a private channel
 * immediately after persisting to Postgres.
 *
 * Design choices:
 *   - Authoritative on the SERVER, not on the sender's client. If the
 *     browser's broadcast is rate-limited or dropped, we'd lose messages.
 *     Server REST call is the source of push.
 *   - Failures are swallowed (logged) — the row is already in Postgres,
 *     so receivers can always recover by refetching on tab focus.
 *   - `private: true` is required because the channel has an auth policy
 *     on realtime.messages (see 0006_chat_foundation migration).
 */

export type BroadcastMessage = {
  topic: string
  event: string
  payload: unknown
}

/**
 * Send one or more broadcast messages to private channels.
 * Silent on failure — caller should assume the DB write is source of truth.
 */
export async function sendRealtimeBroadcast(
  messages: BroadcastMessage | BroadcastMessage[],
): Promise<{ ok: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[broadcast] env missing — NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return { ok: false }
  }

  const payload = {
    messages: (Array.isArray(messages) ? messages : [messages]).map((m) => ({
      topic: m.topic,
      event: m.event,
      payload: m.payload,
      private: true,
    })),
  }

  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[broadcast] non-ok', {
        status: res.status,
        body: text.slice(0, 500),
      })
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    console.error('[broadcast] threw', err)
    return { ok: false }
  }
}
