'use server'

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getFastSession } from '@/lib/auth/fast-session'

/**
 * Heartbeat — updates `users.last_seen_at = now()` for the current user.
 *
 * Called by the client every ~60s while the tab is visible, and
 * immediately whenever the page becomes visible (visibilitychange).
 * Background tabs DO NOT heartbeat — this is deliberate, so a user
 * can't fake "always online" by leaving a tab open in a background
 * window. It also keeps write volume sane (≈1 write/user/minute of
 * actual active use).
 *
 * Single-statement indexed UPDATE via the fast session. Fire-and-forget
 * from the client side — failure is OK (next heartbeat recovers).
 */
export async function heartbeatAction(): Promise<{ ok: boolean }> {
  const session = await getFastSession()
  if (!session) return { ok: false }

  try {
    await db.execute(sql`
      UPDATE users
         SET last_seen_at = now()
       WHERE id = ${session.userId}::uuid
    `)
    return { ok: true }
  } catch (err) {
    console.error('[Presence] heartbeat failed', err)
    return { ok: false }
  }
}
