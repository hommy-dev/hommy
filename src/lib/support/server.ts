// Server-only helpers shared by the support actions (src/lib/actions/support.ts)
// and the sendMessage support hook (src/lib/actions/messages.ts). NOT a 'use
// server' module — these are plain async helpers, not callable actions.

import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { conversations, conversationParticipants, messages, supportTickets, users } from "@/lib/db/schema"
import { sendNotification } from "@/lib/notifications"
import { broadcastUserEvent } from "@/lib/realtime/user-events"
import { getAdminUserIds } from "@/lib/data/support"
import {
  SUPPORT_LOGO_URL,
  SUPPORT_USER_EMAIL,
  SUPPORT_USER_ID,
  SUPPORT_USER_NAME,
  type TicketStatus,
} from "@/lib/support/constants"

const WELCOME =
  "👋 Welcome to Hommy Support. Ask us anything, report a problem, or suggest a feature. We usually reply within a day."

// 'HOM-' + 6 uppercase base36 chars; the unique index is the real guard.
function genRef(): string {
  let s = ""
  for (let i = 0; i < 6; i++) s += Math.floor(Math.random() * 36).toString(36)
  return `HOM-${s.toUpperCase()}`
}

/**
 * The single platform "Hommy Support" user (idempotent). It carries the brand
 * logo as its avatar; admins/AI post AS this identity so the channel and every
 * platform message show one uniform, data-driven face.
 */
export async function ensurePlatformUser(): Promise<void> {
  await db
    .insert(users)
    .values({
      id: SUPPORT_USER_ID,
      email: SUPPORT_USER_EMAIL,
      fullName: SUPPORT_USER_NAME,
      avatarUrl: SUPPORT_LOGO_URL,
      role: "admin",
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { fullName: SUPPORT_USER_NAME, avatarUrl: SUPPORT_LOGO_URL },
    })
}

/**
 * The user's single ongoing "Hommy Support" conversation, creating it (plus the
 * sidecar ticket + a welcome message) on first use. Returns the conversation id.
 */
export async function ensureSupportConversation(userId: string, role: string): Promise<string> {
  await ensurePlatformUser()

  const [existing] = await db
    .select({ conversationId: supportTickets.conversationId })
    .from(supportTickets)
    .where(eq(supportTickets.requesterId, userId))
    .limit(1)
  if (existing) {
    // Backfill the platform participant for threads created before this existed.
    await db
      .insert(conversationParticipants)
      .values({
        conversationId: existing.conversationId,
        participantType: "user",
        participantId: SUPPORT_USER_ID,
      })
      .onConflictDoNothing()
    return existing.conversationId
  }

  return db.transaction(async (tx) => {
    // Re-check inside the txn (handles a concurrent first-open race).
    const [again] = await tx
      .select({ conversationId: supportTickets.conversationId })
      .from(supportTickets)
      .where(eq(supportTickets.requesterId, userId))
      .limit(1)
    if (again) return again.conversationId

    const [convo] = await tx
      .insert(conversations)
      .values({ type: "direct", contextType: "support" })
      .returning({ id: conversations.id })

    // Two participants: the requester + the platform "Hommy Support" user (whose
    // avatar/name drive the channel + platform-message display).
    await tx.insert(conversationParticipants).values([
      { conversationId: convo.id, participantType: "user", participantId: userId },
      { conversationId: convo.id, participantType: "user", participantId: SUPPORT_USER_ID },
    ])

    let ticketOk = false
    for (let i = 0; i < 5 && !ticketOk; i++) {
      const inserted = await tx
        .insert(supportTickets)
        .values({
          conversationId: convo.id,
          requesterId: userId,
          requesterRole: role,
          ref: genRef(),
          status: "open",
        })
        .onConflictDoNothing({ target: supportTickets.ref })
        .returning({ id: supportTickets.id })
      ticketOk = inserted.length > 0
    }
    if (!ticketOk) throw new Error("could not allocate support ticket ref")

    await tx.insert(messages).values({
      conversationId: convo.id,
      senderType: "system",
      senderId: null,
      body: WELCOME,
    })

    return convo.id
  })
}

/**
 * After a user posts into their support thread: reopen the ticket if needed, bump
 * activity, and ping the platform team (rail patch + notification). Admins receive
 * the message itself live via the chat channel (RLS now allows it).
 */
export async function notifyAdminsOfSupportMessage(conversationId: string, preview: string): Promise<void> {
  const now = new Date()
  // Reopen if it was waiting/closed; otherwise leave 'open'/'in_progress' as-is.
  const [t] = await db
    .update(supportTickets)
    .set({ lastMessageAt: now, updatedAt: now, closedAt: null })
    .where(eq(supportTickets.conversationId, conversationId))
    .returning({ status: supportTickets.status, ref: supportTickets.ref })
  if (!t) return
  const reopened: TicketStatus[] = ["waiting_on_user", "resolved", "closed"]
  if (reopened.includes(t.status as TicketStatus)) {
    await db.update(supportTickets).set({ status: "open" }).where(eq(supportTickets.conversationId, conversationId))
  }

  const adminIds = await getAdminUserIds()
  if (adminIds.length === 0) return
  const createdAt = now.toISOString()
  await Promise.all([
    ...adminIds.map((id) =>
      broadcastUserEvent(id, "message:new", { conversationId, preview, createdAt, mine: false }),
    ),
    ...adminIds.map((id) =>
      sendNotification({
        userId: id,
        type: "SUPPORT",
        title: `Support · ${t.ref}`,
        body: preview,
        actionUrl: "/admin/support",
        entityType: "SUPPORT",
        entityId: conversationId,
        sendEmail: false,
        sendSms: false,
      }).catch(() => {}),
    ),
  ])
}

/** True if the conversation is a Hommy Support thread (used by the sendMessage hook). */
export async function isSupportConversation(conversationId: string): Promise<boolean> {
  const [c] = await db
    .select({ contextType: conversations.contextType })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1)
  return c?.contextType === "support"
}
