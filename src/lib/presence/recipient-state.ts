// ============================================================
// Presence-aware notification gating.
//
// Computes a single "where is the recipient right now" signal from the
// data we already store. Used by chat (and any future per-conversation
// notification path) to decide which channels to fire.
//
// We deliberately do NOT add a separate presence write path — `users.last_seen_at`
// (heartbeat every ~60s while tab visible) and `conversation_members.last_read_at`
// (bumped when the chat window opens / tab becomes visible / a new message arrives)
// already give us everything we need.
// ============================================================

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export type RecipientState =
  /** Chat is open and tab is focused. They literally see the message land. */
  | 'viewing'
  /** Active on PaintPro right now, but not in this conversation. */
  | 'on_platform'
  /** Last seen 2–15 min ago. Probably switched away briefly. */
  | 'recently_away'
  /** Last seen > 15 min ago, or never. Treat as offline. */
  | 'away'
  /** Conversation is muted until a future timestamp. */
  | 'muted'

const VIEWING_LAST_SEEN_S    = 90    // active heartbeat in last 90s
const VIEWING_LAST_READ_S    = 120   // engaged with this thread in last 2 min
const ON_PLATFORM_LAST_SEEN_S = 120  // any heartbeat in last 2 min counts as on-platform
const AWAY_THRESHOLD_S       = 900   // > 15 min = truly away

interface PresenceRow {
  last_seen_seconds_ago: number | null
  last_read_seconds_ago: number | null
  is_muted: boolean
}

/**
 * Resolve the recipient's state for a given conversation.
 *
 * Single round-trip — joins users + conversation_members and computes the
 * three time deltas in SQL. Returns the most-restrictive bucket the user
 * falls into. Mute trumps everything.
 */
export async function getRecipientState(
  recipientUserId: string,
  conversationId: string,
): Promise<RecipientState> {
  const rows = (await db.execute(sql`
    SELECT
      EXTRACT(EPOCH FROM (now() - u.last_seen_at))::int AS last_seen_seconds_ago,
      EXTRACT(EPOCH FROM (now() - cm.last_read_at))::int AS last_read_seconds_ago,
      (cm.muted_until IS NOT NULL AND cm.muted_until > now()) AS is_muted
    FROM users u
    LEFT JOIN conversation_members cm
      ON cm.user_id = u.id
     AND cm.conversation_id = ${conversationId}::uuid
    WHERE u.id = ${recipientUserId}::uuid
    LIMIT 1
  `)) as unknown as PresenceRow[]

  const row = rows[0]
  if (!row) {
    // Unknown user → treat as away (most conservative for delivery).
    return 'away'
  }

  if (row.is_muted) return 'muted'

  const seenAgo = row.last_seen_seconds_ago
  const readAgo = row.last_read_seconds_ago

  // Viewing: actively heartbeating AND recently engaged with this thread.
  if (
    seenAgo != null && seenAgo <= VIEWING_LAST_SEEN_S &&
    readAgo != null && readAgo <= VIEWING_LAST_READ_S
  ) {
    return 'viewing'
  }

  // On platform: heartbeat fresh, but not viewing this thread.
  if (seenAgo != null && seenAgo <= ON_PLATFORM_LAST_SEEN_S) {
    return 'on_platform'
  }

  // Away vs recently-away cutoff.
  if (seenAgo != null && seenAgo <= AWAY_THRESHOLD_S) {
    return 'recently_away'
  }

  return 'away'
}
