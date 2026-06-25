'use server'

// Hommy Support actions. The thread lives on the messaging graph (one ongoing
// conversation per user, contextType='support'); support_tickets is the sidecar
// for admin triage. User-facing sending uses the normal sendMessage path; these
// actions cover thread creation, the feature-suggestion entry, and admin replies
// + triage. A future admin-side AI calls adminReplySupport.

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { db } from '@/lib/db'
import { messages, supportTickets, type MessageMeta } from '@/lib/db/schema'
import { getRequiredUser } from '@/lib/auth/session'
import { sendNotification } from '@/lib/notifications'
import { sendRealtimeBroadcast } from '@/lib/realtime/broadcast'
import { broadcastUserEvent } from '@/lib/realtime/user-events'
import type { ThreadMessage } from '@/lib/data/conversations'
import { adminGetSupportThread, type AdminSupportThread } from '@/lib/data/support'
import { ensureSupportConversation, notifyAdminsOfSupportMessage } from '@/lib/support/server'
import {
  STATUS_LABEL,
  SUPPORT_USER_ID,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketStatus,
} from '@/lib/support/constants'

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> }

function messagesThreadPath(role: string, conversationId: string): string {
  const base = role === 'homeowner' ? '/homeowner/messages' : '/contractor/messages'
  return `${base}/${conversationId}`
}

/**
 * Post a message from the requester into their support thread: ensure the thread,
 * insert the message, tag the ticket category, push it live, and ping admins.
 * Used by both the feature-card and the typed-request flows.
 */
async function postUserSupportMessage(opts: {
  userId: string
  role: string
  body: string
  meta?: MessageMeta
  category: string
  preview: string
}): Promise<string> {
  const conversationId = await ensureSupportConversation(opts.userId, opts.role)
  const [row] = await db
    .insert(messages)
    .values({
      conversationId,
      senderType: 'user',
      senderId: opts.userId,
      body: opts.body,
      meta: opts.meta ?? null,
    })
    .returning({ id: messages.id, createdAt: messages.createdAt })
  await db
    .update(supportTickets)
    .set({ category: opts.category })
    .where(eq(supportTickets.conversationId, conversationId))

  const message: ThreadMessage = {
    id: row.id,
    senderType: 'user',
    senderId: opts.userId,
    body: opts.body,
    meta: opts.meta ?? null,
    createdAt: row.createdAt.toISOString(),
    isMine: true,
  }
  void sendRealtimeBroadcast({ topic: `chat:${conversationId}`, event: 'message:new', payload: message })
  void broadcastUserEvent(opts.userId, 'message:new', {
    conversationId,
    preview: opts.preview,
    createdAt: message.createdAt,
    mine: true,
  })
  await notifyAdminsOfSupportMessage(conversationId, opts.preview)
  return conversationId
}

const SuggestSchema = z.object({
  subject: z.string().trim().min(3, 'Add a short title').max(140),
  details: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(4000),
})

/** Post a feature suggestion as a card into the user's support thread. */
export async function submitFeatureSuggestion(
  input: unknown,
): Promise<ActionResult<{ conversationId: string }>> {
  const user = await getRequiredUser()
  const parsed = SuggestSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { success: false, error: 'Please check the details and try again.', fieldErrors }
  }
  const { subject, details } = parsed.data

  try {
    const conversationId = await postUserSupportMessage({
      userId: user.id,
      role: user.role,
      body: subject,
      meta: { kind: 'feature_request', subject, details },
      category: 'feature_request',
      preview: `💡 ${subject}`,
    })
    return { success: true, data: { conversationId } }
  } catch (err) {
    console.error('[submitFeatureSuggestion] failed', err)
    return { success: false, error: 'Could not send your idea. Please try again.' }
  }
}

const SubmitMessageSchema = z.object({
  type: z.enum(['feature_request', 'problem', 'billing', 'other']),
  subject: z.string().trim().max(140).optional(),
  body: z.string().trim().min(1, 'Write a message').max(4000),
})

/**
 * The header Support modal's send. Creates/opens the user's support thread, tags
 * the topic, and posts the first message — a feature_request renders as a card
 * (needs a subject), everything else as plain text. Returns the conversation id
 * so the modal can navigate into the chat.
 */
export async function submitSupportMessage(
  input: unknown,
): Promise<ActionResult<{ conversationId: string }>> {
  const user = await getRequiredUser()
  const parsed = SubmitMessageSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { success: false, error: 'Please check the details and try again.', fieldErrors }
  }
  const { type, subject, body } = parsed.data
  if (type === 'feature_request' && (!subject || subject.length < 3)) {
    return { success: false, error: 'Add a short title.', fieldErrors: { subject: 'Add a short title' } }
  }

  try {
    const isFeature = type === 'feature_request'
    const conversationId = await postUserSupportMessage({
      userId: user.id,
      role: user.role,
      body: isFeature ? subject!.trim() : body,
      meta: isFeature ? { kind: 'feature_request', subject: subject!.trim(), details: body } : undefined,
      category: type,
      preview: isFeature ? `💡 ${subject!.trim()}` : body.slice(0, 140),
    })
    return { success: true, data: { conversationId } }
  } catch (err) {
    console.error('[submitSupportMessage] failed', err)
    return { success: false, error: 'Could not send your message. Please try again.' }
  }
}

const ReplySchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1, 'Write a reply').max(4000),
})

/** Lazy-load a support thread for the admin console. */
export async function getAdminSupportThreadAction(conversationId: string): Promise<AdminSupportThread | null> {
  await getRequiredUser('admin')
  return adminGetSupportThread(conversationId)
}

/** Admin (or future AI) replies in a support thread as "Hommy Support". */
export async function adminReplySupport(input: unknown): Promise<ActionResult<{ ok: true }>> {
  await getRequiredUser('admin')
  const parsed = ReplySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid reply.' }
  }
  const { conversationId, body } = parsed.data

  const [ticket] = await db
    .select({ requesterId: supportTickets.requesterId, requesterRole: supportTickets.requesterRole, ref: supportTickets.ref })
    .from(supportTickets)
    .where(eq(supportTickets.conversationId, conversationId))
    .limit(1)
  if (!ticket) return { success: false, error: 'Support thread not found.' }

  // Reply AS the platform identity (not the individual admin), so the requester
  // always sees "Hommy Support" with the logo avatar.
  try {
    const now = new Date()
    const [row] = await db
      .insert(messages)
      .values({ conversationId, senderType: 'user', senderId: SUPPORT_USER_ID, body })
      .returning({ id: messages.id, createdAt: messages.createdAt })
    await db
      .update(supportTickets)
      .set({ status: 'waiting_on_user', lastMessageAt: now, updatedAt: now, closedAt: null })
      .where(eq(supportTickets.conversationId, conversationId))

    // The requester sees the reply live (they're a participant) + a rail patch + a notification.
    const message: ThreadMessage = {
      id: row.id,
      senderType: 'user',
      senderId: SUPPORT_USER_ID,
      body,
      meta: null,
      createdAt: row.createdAt.toISOString(),
      isMine: false,
    }
    void sendRealtimeBroadcast({ topic: `chat:${conversationId}`, event: 'message:new', payload: message })
    void broadcastUserEvent(ticket.requesterId, 'message:new', {
      conversationId,
      preview: body.slice(0, 140),
      createdAt: message.createdAt,
      mine: false,
    })
    await sendNotification({
      userId: ticket.requesterId,
      type: 'SUPPORT',
      title: 'Reply from Hommy Support',
      body: body.slice(0, 200),
      actionUrl: messagesThreadPath(ticket.requesterRole, conversationId),
      entityType: 'SUPPORT',
      entityId: conversationId,
      sendSms: false,
    })

    revalidatePath('/admin/support')
    return { success: true, data: { ok: true } }
  } catch (err) {
    console.error('[adminReplySupport] failed', err)
    return { success: false, error: 'Could not send your reply.' }
  }
}

/** Insert a system note into the thread and push it live to both sides. */
async function postSystemMessage(conversationId: string, body: string): Promise<void> {
  const [row] = await db
    .insert(messages)
    .values({ conversationId, senderType: 'system', senderId: null, body })
    .returning({ id: messages.id, createdAt: messages.createdAt })
  const message: ThreadMessage = {
    id: row.id,
    senderType: 'system',
    senderId: null,
    body,
    meta: null,
    createdAt: row.createdAt.toISOString(),
    isMine: false,
  }
  void sendRealtimeBroadcast({ topic: `chat:${conversationId}`, event: 'message:new', payload: message })
}

const StatusSchema = z.object({ conversationId: z.string().uuid(), status: z.enum(TICKET_STATUSES) })

export async function setSupportStatus(input: unknown): Promise<ActionResult<{ ok: true }>> {
  await getRequiredUser('admin')
  const parsed = StatusSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid status.' }
  const { conversationId, status } = parsed.data
  const closing = status === 'resolved' || status === 'closed'
  try {
    await db
      .update(supportTickets)
      .set({ status, updatedAt: new Date(), closedAt: closing ? new Date() : null })
      .where(eq(supportTickets.conversationId, conversationId))
    await postSystemMessage(conversationId, `Marked ${STATUS_LABEL[status as TicketStatus].toLowerCase()}`)
    revalidatePath('/admin/support')
    return { success: true, data: { ok: true } }
  } catch (err) {
    console.error('[setSupportStatus] failed', err)
    return { success: false, error: 'Could not update status.' }
  }
}

const PrioritySchema = z.object({ conversationId: z.string().uuid(), priority: z.enum(TICKET_PRIORITIES) })

export async function setSupportPriority(input: unknown): Promise<ActionResult<{ ok: true }>> {
  await getRequiredUser('admin')
  const parsed = PrioritySchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid priority.' }
  const { conversationId, priority } = parsed.data
  try {
    await db
      .update(supportTickets)
      .set({ priority, updatedAt: new Date() })
      .where(eq(supportTickets.conversationId, conversationId))
    revalidatePath('/admin/support')
    return { success: true, data: { ok: true } }
  } catch (err) {
    console.error('[setSupportPriority] failed', err)
    return { success: false, error: 'Could not update priority.' }
  }
}

export async function assignSupportToMe(input: unknown): Promise<ActionResult<{ ok: true }>> {
  const admin = await getRequiredUser('admin')
  const parsed = z.object({ conversationId: z.string().uuid() }).safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid thread.' }
  const { conversationId } = parsed.data
  try {
    await db
      .update(supportTickets)
      .set({ assignedAdminId: admin.id, status: 'in_progress', updatedAt: new Date() })
      .where(eq(supportTickets.conversationId, conversationId))
    await postSystemMessage(conversationId, `Assigned to ${admin.fullName || 'a support agent'}`)
    revalidatePath('/admin/support')
    return { success: true, data: { ok: true } }
  } catch (err) {
    console.error('[assignSupportToMe] failed', err)
    return { success: false, error: 'Could not assign the thread.' }
  }
}
