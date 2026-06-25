'use server'

// Messaging actions for the universal conversation graph (docs §6). Text-only
// MVP (D5): no attachments, no leakage scan, no cold-open. System events (quote
// sent/accepted) are plain `messages` rows with sender_type='system'.

import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contractorMembers,
  conversationParticipants,
  messages,
  users,
  type ChatAttachment,
} from '@/lib/db/schema'
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  isBlockedFile,
} from '@/lib/chat/attachments'
import { getRequiredUserId } from '@/lib/auth/session'
import {
  getConversationForUser,
  getConversationRecipientUserIds,
  listConversationsForUser,
  listMessages,
  meConditionForUser,
  resolveParticipantForUser,
  type ConversationDetail,
  type ConversationSummary,
  type ParticipantIdentity,
  type ThreadMessage,
} from '@/lib/data/conversations'
import { getJobPanelForConversation, type JobPanel } from '@/lib/data/jobs'
import { sendNotification } from '@/lib/notifications'
import { broadcastUserEvent } from '@/lib/realtime/user-events'
import { sendRealtimeBroadcast } from '@/lib/realtime/broadcast'
import { isSupportConversation, notifyAdminsOfSupportMessage } from '@/lib/support/server'

type Fail<E extends string> = { ok: false; error: E; message: string }

// Body is optional WHEN attachments are present (a file-only message), so the
// length check is "body OR attachments", enforced below — not in the schema.
const bodySchema = z.string().trim().max(2000)

// Server-side re-validation of each attachment. The client already validated,
// but never trust it: pin the host to Cloudinary (block link injection), cap
// the size, and refuse blocked file types.
const attachmentSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => {
      try {
        return new URL(u).hostname === 'res.cloudinary.com'
      } catch {
        return false
      }
    }, 'Attachment must be a Cloudinary URL'),
  publicId: z.string().min(1),
  resourceType: z.enum(['image', 'video', 'raw']),
  name: z.string().trim().min(1).max(255).refine((n) => !isBlockedFile(n), 'File type not allowed'),
  bytes: z.number().int().nonnegative().max(MAX_ATTACHMENT_BYTES, 'File is too large'),
  format: z.string().nullable(),
  width: z.number().optional(),
  height: z.number().optional(),
})
const attachmentsSchema = z.array(attachmentSchema).max(MAX_ATTACHMENTS_PER_MESSAGE)

export type SendMessageResult =
  | { ok: true; message: ThreadMessage }
  | Fail<'UNAUTHENTICATED' | 'INVALID_INPUT' | 'NOT_MEMBER' | 'DB_ERROR'>

export async function sendMessage(
  conversationId: string,
  rawBody: string,
  rawAttachments?: unknown,
): Promise<SendMessageResult> {
  const userId = await getRequiredUserId()

  const parsedBody = bodySchema.safeParse(rawBody)
  if (!parsedBody.success) {
    return { ok: false, error: 'INVALID_INPUT', message: parsedBody.error.issues[0]?.message ?? 'Invalid message.' }
  }
  const body = parsedBody.data

  const parsedAttachments = attachmentsSchema.safeParse(rawAttachments ?? [])
  if (!parsedAttachments.success) {
    return { ok: false, error: 'INVALID_INPUT', message: parsedAttachments.error.issues[0]?.message ?? 'Invalid attachment.' }
  }
  const files: ChatAttachment[] = parsedAttachments.data

  // A message needs either text or at least one file.
  if (body.length === 0 && files.length === 0) {
    return { ok: false, error: 'INVALID_INPUT', message: 'Message is required' }
  }

  // One round-trip: resolve the viewer's participant identity (folds the
  // contractor-seats lookup into the query) — also the authorization gate.
  const me = await resolveParticipantForUser(conversationId, userId)
  if (!me) return { ok: false, error: 'NOT_MEMBER', message: 'You are not part of this conversation.' }

  const meta = files.length > 0 ? { kind: 'attachment' as const, files } : null

  let row: { id: string; createdAt: Date }
  try {
    const [inserted] = await db
      .insert(messages)
      .values({ conversationId, senderType: me.type, senderId: me.id, body, channel: 'platform', meta })
      .returning({ id: messages.id, createdAt: messages.createdAt })
    row = inserted
  } catch (err) {
    console.error('[sendMessage] insert failed', err)
    return { ok: false, error: 'DB_ERROR', message: 'Could not send your message.' }
  }

  const createdAt = row.createdAt.toISOString()
  const message: ThreadMessage = {
    id: row.id,
    senderType: me.type,
    senderId: me.id,
    body,
    meta,
    createdAt,
    isMine: true,
  }

  // Live fan-out (fire-and-forget) — the row is already committed.
  //  • chat:{id} carries the full message so open threads append it.
  //  • each participant's user:{id} gets an inbox-rail patch (incl. the sender,
  //    so their own sidebar updates), and every OTHER participant a notification.
  void sendRealtimeBroadcast({
    topic: `chat:${conversationId}`,
    event: 'message:new',
    payload: message,
  }).catch((e) => console.error('[sendMessage] chat broadcast threw', e))

  // What the rail/notification shows. A file-only message has no body, so fall
  // back to a short attachment label.
  const preview = body || attachmentPreview(files)
  // Fan-out (fire-and-forget). Support threads take a dedicated path: ping the
  // platform team + patch the requester's own rail, but skip the participant
  // fan-out (the platform "Hommy Support" user isn't a notifiable party).
  void (async () => {
    if (me.type === 'user' && (await isSupportConversation(conversationId))) {
      await notifyAdminsOfSupportMessage(conversationId, preview.slice(0, 140))
      await broadcastUserEvent(userId, 'message:new', {
        conversationId,
        preview: preview.slice(0, 140),
        createdAt,
        mine: true,
      })
      return
    }
    await fanOutInbox(conversationId, me, userId, preview, createdAt)
  })().catch((e) => console.error('[sendMessage] fan-out threw', e))

  return { ok: true, message }
}

/** Short human label for a file-only message, used in the rail + notifications. */
function attachmentPreview(files: ChatAttachment[]): string {
  if (files.length === 0) return ''
  if (files.length === 1) return `📎 ${files[0].name}`
  return `📎 ${files.length} files`
}

export type MarkReadResult = { ok: true } | Fail<'UNAUTHENTICATED' | 'NOT_MEMBER' | 'DB_ERROR'>

export async function markConversationRead(conversationId: string): Promise<MarkReadResult> {
  const userId = await getRequiredUserId()

  try {
    // One round-trip: stamp last_read_at on the viewer's participant row(s)
    // directly. An empty result means they aren't a participant.
    const updated = await db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          meConditionForUser(userId),
        ),
      )
      .returning({ id: conversationParticipants.id })
    if (updated.length === 0) {
      return { ok: false, error: 'NOT_MEMBER', message: 'You are not part of this conversation.' }
    }
    return { ok: true }
  } catch (err) {
    console.error('[markConversationRead] failed', err)
    return { ok: false, error: 'DB_ERROR', message: 'Could not update.' }
  }
}

/** The viewer's inbox rows — fetched client-side so the rail chrome paints first. */
export async function listConversationSummaries(): Promise<ConversationSummary[]> {
  const userId = await getRequiredUserId()
  return listConversationsForUser(userId)
}

export type FetchThreadResult =
  | {
      ok: true
      detail: ConversationDetail
      messages: ThreadMessage[]
      hasMore: boolean
      panel: JobPanel | null
    }
  | { ok: false }

/**
 * Everything the client thread needs in one round-trip: the header detail, the
 * first page of messages, and the job control panel — fetched in parallel. The
 * client caches the result so revisits are instant; this is the only call a
 * conversation switch makes (no full page navigation).
 */
export async function fetchThread(conversationId: string): Promise<FetchThreadResult> {
  const userId = await getRequiredUserId()
  const detail = await getConversationForUser(conversationId, userId)
  if (!detail) return { ok: false }

  const [page, panel] = await Promise.all([
    listMessages(conversationId, detail.me, { limit: 40 }),
    getJobPanelForConversation(conversationId, userId),
  ])
  return { ok: true, detail, messages: page.messages, hasMore: page.hasMore, panel }
}

export type LoadOlderResult =
  | { ok: true; messages: ThreadMessage[]; hasMore: boolean }
  | Fail<'UNAUTHENTICATED' | 'NOT_MEMBER' | 'INVALID_INPUT'>

export async function loadOlderMessages(
  conversationId: string,
  beforeIso: string,
): Promise<LoadOlderResult> {
  const userId = await getRequiredUserId()
  const me = await resolveParticipantForUser(conversationId, userId)
  if (!me) return { ok: false, error: 'NOT_MEMBER', message: 'You are not part of this conversation.' }
  if (!beforeIso || Number.isNaN(Date.parse(beforeIso))) {
    return { ok: false, error: 'INVALID_INPUT', message: 'Invalid cursor.' }
  }

  const page = await listMessages(conversationId, { type: me.type, id: me.id }, { before: beforeIso, limit: 40 })
  return { ok: true, messages: page.messages, hasMore: page.hasMore }
}

/**
 * Patch every participant's inbox rail (sender included, so their own sidebar
 * reflects the message), and push a notification to everyone but the sender.
 * The rail event carries a preview + timestamp so clients update in place
 * without a server round-trip; `mine` marks the recipients who share the
 * sender's participant identity (the sending user, or all members of the sending
 * company) so the conversation doesn't show as unread for them.
 */
async function fanOutInbox(
  conversationId: string,
  sender: ParticipantIdentity,
  senderUserId: string,
  body: string,
  createdAt: string,
): Promise<void> {
  // excludeUserId '' removes nobody → every participant user, sender included.
  const allIds = await getConversationRecipientUserIds(conversationId, '')
  if (allIds.length === 0) return
  const preview = body.slice(0, 140)

  // Users for whom this message is "their own" — same participant identity as the
  // sender: the sending user, or every active member of the sending company.
  let mineUserIds: Set<string>
  if (sender.type === 'contractor') {
    const members = await db
      .select({ userId: contractorMembers.userId })
      .from(contractorMembers)
      .where(and(eq(contractorMembers.contractorId, sender.id), eq(contractorMembers.status, 'active')))
    mineUserIds = new Set(members.map((m) => m.userId))
  } else {
    mineUserIds = new Set([sender.id])
  }

  const others = allIds.filter((uid) => uid !== senderUserId)

  // Role lookup only for the notification deep links (others only).
  const roleById = new Map<string, string>()
  if (others.length > 0) {
    const roleRows = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(inArray(users.id, others))
    for (const r of roleRows) roleById.set(r.id, r.role)
  }

  await Promise.all([
    ...allIds.map((uid) =>
      broadcastUserEvent(uid, 'message:new', {
        conversationId,
        preview,
        createdAt,
        mine: mineUserIds.has(uid),
      }),
    ),
    ...others.map((uid) =>
      sendNotification({
        userId: uid,
        type: 'MESSAGE',
        title: 'New message',
        body: preview,
        actionUrl: `/${roleById.get(uid) ?? 'homeowner'}/messages/${conversationId}`,
        entityType: 'MESSAGE',
        entityId: conversationId,
        sendEmail: false,
        sendSms: false,
      }).catch((e) => console.error('[sendMessage] notify error', { uid, e })),
    ),
  ])
}
