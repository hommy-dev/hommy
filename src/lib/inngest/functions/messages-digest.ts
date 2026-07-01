// `messages-digest` — every 15 min. Emails users about chat messages they
// haven't seen, because in-app MESSAGE notifications only reach someone who is
// actively on the platform (see src/lib/actions/messages.ts — message
// notifications send with sendEmail:false by design). For the 95% case where
// the recipient isn't logged in, this digest is how they learn they have mail.
//
// What it sends: one email per recipient summarizing every still-unread MESSAGE
// notification, grouped by conversation (renderMessagesDigestEmail).
//
// Two gates keep it honest:
//   - QUIET_PERIOD (15 min): only messages old enough that a live/active chat
//     has settled — we don't email someone mid-conversation.
//   - lastReadAt: reading a thread updates conversation_participants.lastReadAt
//     but NOT the notification row (only the bell UI marks notifications read),
//     so we must re-check lastReadAt or we'd email "you missed a message" about
//     one they already read. A conversation the recipient has read past is
//     dropped (and left unflagged so it simply ages out of the window).
//
// Idempotent: sentEmail flips to true ONLY on notifications actually included in
// a sent email. New messages later produce a fresh digest; the same ones never
// send twice.

import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import { inngest } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { conversationParticipants, notifications, users } from '@/lib/db/schema'
import { sendEmail } from '@/lib/notifications/email'
import { renderMessagesDigestEmail, type DigestConversationRow } from '@/lib/notifications/email/messages-digest'
import { getConversationForUser, meConditionForUser } from '@/lib/data/conversations'

const MINUTE_MS = 60 * 1000
// Don't email about a message until it's had time to be seen live in an open tab.
const QUIET_PERIOD_MS = 15 * MINUTE_MS
// Don't resurrect ancient unreads (also bounds the scan + first-run blast radius).
const LOOKBACK_MS = 3 * 24 * 60 * MINUTE_MS
// Bound one run. At early-stage volume this is never hit; it's a runaway guard.
const MAX_NOTIFICATIONS = 5000

type Candidate = {
  id: string
  userId: string
  conversationId: string
  body: string
  actionUrl: string | null
  createdAt: Date
}

export const messagesDigest = inngest.createFunction(
  {
    id: 'messages-digest',
    name: 'Unread message digest email',
    triggers: [{ cron: '*/15 * * * *' }],
  },
  async () => {
    const now = Date.now()
    const newestCutoff = new Date(now - QUIET_PERIOD_MS)
    const oldestCutoff = new Date(now - LOOKBACK_MS)

    const candidates = (await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        conversationId: notifications.entityId,
        body: notifications.body,
        actionUrl: notifications.actionUrl,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.type, 'MESSAGE'),
          eq(notifications.isRead, false),
          eq(notifications.sentEmail, false),
          gte(notifications.createdAt, oldestCutoff),
          lte(notifications.createdAt, newestCutoff),
        ),
      )
      .orderBy(notifications.userId, notifications.createdAt)
      .limit(MAX_NOTIFICATIONS)) as Candidate[]

    // Rows with no conversation id can't be grouped into a digest — ignore them.
    const byUser = new Map<string, Candidate[]>()
    for (const c of candidates) {
      if (!c.conversationId) continue
      const list = byUser.get(c.userId)
      if (list) list.push(c)
      else byUser.set(c.userId, [c])
    }

    let usersEmailed = 0
    let notificationsSent = 0

    for (const [userId, rows] of byUser) {
      try {
        const convIds = [...new Set(rows.map((r) => r.conversationId))]

        // The recipient's read cursor per conversation. Reading a thread updates
        // this; it's the only reliable "have they actually seen it" signal.
        const partRows = await db
          .select({
            conversationId: conversationParticipants.conversationId,
            lastReadAt: conversationParticipants.lastReadAt,
          })
          .from(conversationParticipants)
          .where(and(inArray(conversationParticipants.conversationId, convIds), meConditionForUser(userId)))

        const lastReadByConv = new Map<string, Date | null>()
        for (const p of partRows) {
          const prev = lastReadByConv.get(p.conversationId)
          // A user can be both a `user` and a `contractor` participant; the most
          // recent read wins (most likely to suppress a stale notification).
          if (prev === undefined || (p.lastReadAt && (!prev || p.lastReadAt > prev))) {
            lastReadByConv.set(p.conversationId, p.lastReadAt)
          }
        }

        // Group this user's notifications by conversation.
        const byConv = new Map<string, Candidate[]>()
        for (const r of rows) {
          const list = byConv.get(r.conversationId)
          if (list) list.push(r)
          else byConv.set(r.conversationId, [r])
        }

        const digestRows: DigestConversationRow[] = []
        const emailedIds: string[] = []

        for (const [conversationId, convNotifs] of byConv) {
          // Newest unread notification in this conversation drives the preview.
          const newest = convNotifs.reduce((a, b) => (b.createdAt > a.createdAt ? b : a))
          const lastRead = lastReadByConv.get(conversationId)

          // Already caught up in-thread → not "missed". Skip and leave unflagged;
          // it ages out of the lookback window on its own.
          if (lastRead && lastRead >= newest.createdAt) continue

          const detail = await getConversationForUser(conversationId, userId)
          if (!detail) continue // not (or no longer) a participant — skip

          digestRows.push({
            conversationId,
            actionUrl: newest.actionUrl ?? `/homeowner/messages/${conversationId}`,
            peerName: detail.otherName,
            latestPreview: newest.body,
            unreadCount: convNotifs.length,
          })
          for (const n of convNotifs) emailedIds.push(n.id)
        }

        if (digestRows.length === 0) continue

        const [user] = await db
          .select({ email: users.email, fullName: users.fullName })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)
        if (!user?.email) continue

        const totalUnread = digestRows.reduce((sum, r) => sum + r.unreadCount, 0)
        const { subject, html } = renderMessagesDigestEmail({
          recipientName: user.fullName || user.email,
          conversations: digestRows,
          totalConversations: digestRows.length,
          totalUnread,
        })

        const res = await sendEmail(user.email, subject, html)
        if (!res.success) {
          console.error('[messages-digest] send failed', { userId, error: res.error })
          continue // leave sentEmail=false so the next run retries
        }

        // Flag only what we actually emailed — new messages still trigger a fresh
        // digest, but these exact notifications never send twice.
        await db
          .update(notifications)
          .set({ sentEmail: true })
          .where(inArray(notifications.id, emailedIds))

        usersEmailed += 1
        notificationsSent += emailedIds.length
      } catch (err) {
        console.error('[messages-digest] user failed', { userId, err })
      }
    }

    return {
      ok: true,
      candidates: candidates.length,
      usersEmailed,
      notificationsSent,
    }
  },
)
