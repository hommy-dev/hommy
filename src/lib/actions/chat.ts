'use server'

import { and, desc, eq, gt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { incidents, notifications, users } from '@/lib/db/schema'
import { getFastSession } from '@/lib/auth/fast-session'
import { listMessagesPaged } from '@/lib/data/chat'
import { scanLeakage, type LeakageResult } from '@/lib/chat/leakage'
import { sendNotification } from '@/lib/notifications'
import { getRecipientState } from '@/lib/presence/recipient-state'
import { sendRealtimeBroadcast } from '@/lib/realtime/broadcast'

type Fail<E extends string> = {
  ok: false
  error: E
  message: string
}
type Ok<T = unknown> = { ok: true } & (T extends unknown ? T : never)

// ============================================================
// sendMessageAction — single-statement hot path
//
// Everything happens in ONE SQL round-trip to Postgres:
//   1. Classify eligibility (membership + state machine)
//   2. INSERT the message (only if classification = 'OK')
//   3. UPDATE denormalized preview on conversations
//   4. Broadcast to chat:{conversationId} (per-thread stream)
//   5. Broadcast to user:{userId} for every member (inbox fanout)
//
// Auth is done locally via getClaims() (no network round-trip to
// Supabase Auth). Leakage scan runs in-process, before the SQL.
// Secondary writes (incidents, notification throttle) stay fire-and-forget.
// ============================================================

const attachmentInputSchema = z.object({
  kind: z.enum(['IMAGE', 'AUDIO', 'VIDEO', 'FILE']),
  storagePath: z.string().min(1).max(512),           // Cloudinary public_id
  mime: z.string().min(1).max(128),
  sizeBytes: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative().nullable().optional(),
  width: z.number().int().nonnegative().nullable().optional(),
  height: z.number().int().nonnegative().nullable().optional(),
  waveformPeaks: z.array(z.number()).max(200).optional(),
  resourceType: z.enum(['image', 'video', 'raw']),
  originalFilename: z.string().max(255).optional(),
})

const sendInputSchema = z
  .object({
    content: z.string().trim().max(2000).default(''),
    attachments: z.array(attachmentInputSchema).max(10).optional(),
    parentMessageId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (v) => (v.content && v.content.length > 0) || (v.attachments && v.attachments.length > 0),
    { message: 'Message is required', path: ['content'] },
  )

export type AttachmentInput = z.infer<typeof attachmentInputSchema>

export type MessageAttachmentPayload = {
  id: string
  messageId: string
  kind: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE'
  storagePath: string                 // Cloudinary public_id
  resourceType: 'image' | 'video' | 'raw'
  mime: string
  sizeBytes: number
  durationMs: number | null
  width: number | null
  height: number | null
  waveformPeaks: number[] | null
  originalFilename: string | null
}

export type MessageParentPreviewPayload = {
  id: string
  senderId: string
  content: string
  isDeleted: boolean
  firstAttachmentKind: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE' | null
}

export type SendMessagePayload = {
  id: string
  conversationId: string
  senderId: string
  kind: 'USER' | 'SYSTEM'
  systemPayload: Record<string, unknown> | null
  content: string
  isFlagged: boolean
  flagReason:
    | 'PHONE_NUMBER'
    | 'EMAIL_ADDRESS'
    | 'EXTERNAL_APP'
    | 'SOCIAL_HANDLE'
    | null
  isRead: boolean
  readAt: string | null
  createdAt: string
  deletedAt: string | null
  editedAt: string | null
  parentMessageId: string | null
  parentPreview: MessageParentPreviewPayload | null
  attachments: MessageAttachmentPayload[]
}

export type SendMessageResult =
  | Ok<{
      message: SendMessagePayload
      flagged: boolean
      reasons: string[]
    }>
  | Fail<
      | 'INVALID_INPUT'
      | 'UNAUTHENTICATED'
      | 'NOT_FOUND'
      | 'NOT_MEMBER'
      | 'NOT_ACTIONABLE'
      | 'PARENT_MISMATCH'
      | 'DB_ERROR'
    >

type ClassificationCode =
  | 'OK'
  | 'NOT_FOUND'
  | 'NOT_MEMBER'
  | 'PROJECT_CLOSED'
  | 'QUOTE_INACTIVE'
  | 'COLD_OPEN'
  | 'JOB_CLOSED'
  | 'PARENT_MISMATCH'

type SendRow = {
  code: ClassificationCode
  id: string | null
  conversation_id: string | null
  sender_id: string | null
  content: string | null
  is_flagged: boolean | null
  flag_reason: SendMessagePayload['flagReason']
  is_read: boolean | null
  read_at: Date | null
  created_at: Date | null
  deleted_at: Date | null
  edited_at: Date | null
  parent_message_id: string | null
  parent_preview: unknown
  other_user_id: string | null
  member_user_ids: string[] | null
  attachments_json: unknown | null
}

function previewForAttachments(atts: AttachmentInput[]): string {
  if (atts.length === 0) return ''
  const first = atts[0]
  if (atts.length === 1) {
    if (first.kind === 'IMAGE') return '📷 Photo'
    if (first.kind === 'AUDIO') return '🎤 Voice message'
    if (first.kind === 'VIDEO') return '🎥 Video'
    return `📎 ${first.originalFilename ?? 'File'}`
  }
  return `${atts.length} attachments`
}

export async function sendMessageAction(
  conversationId: string,
  rawContent: string,
  attachments: AttachmentInput[] = [],
  parentMessageId: string | null = null,
): Promise<SendMessageResult> {
  const t0 = Date.now()

  const session = await getFastSession()
  if (!session) {
    return { ok: false, error: 'UNAUTHENTICATED', message: 'Please sign in.' }
  }

  const parsed = sendInputSchema.safeParse({
    content: rawContent,
    attachments,
    parentMessageId,
  })
  if (!parsed.success) {
    return {
      ok: false,
      error: 'INVALID_INPUT',
      message: parsed.error.issues[0]?.message ?? 'Invalid message.',
    }
  }
  const content = parsed.data.content
  const atts = parsed.data.attachments ?? []
  const parentId = parsed.data.parentMessageId ?? null
  // Sidebar preview: text if present, else a kind-aware placeholder.
  const preview = content
    ? content.slice(0, 160)
    : previewForAttachments(atts)

  // In-process leakage scan. Takes <1ms. Skips if no text.
  const leakage: LeakageResult = content
    ? scanLeakage(content)
    : { flagged: false, reasons: [] }
  const { flagged, reasons } = leakage
  const primaryReason = reasons[0] ?? null

  // Serialize attachments to jsonb for the bulk-insert subquery.
  const attachmentsJson = JSON.stringify(
    atts.map((a) => ({
      kind: a.kind,
      storage_path: a.storagePath,
      mime: a.mime,
      size_bytes: a.sizeBytes,
      duration_ms: a.durationMs ?? null,
      width: a.width ?? null,
      height: a.height ?? null,
      metadata: {
        resourceType: a.resourceType,
        ...(a.waveformPeaks ? { waveformPeaks: a.waveformPeaks } : {}),
        ...(a.originalFilename ? { originalFilename: a.originalFilename } : {}),
      },
    })),
  )

  let rows: SendRow[]
  try {
    // The hot-path CTE. One round-trip — classification + INSERT + bump +
    // attachments insert + a cheap members/other-user lookup used for
    // post-response fanout. Realtime broadcasts run AFTER this returns
    // as parallel REST calls (fire-and-forget) so they never extend the
    // response's critical path.
    const result = await db.execute<SendRow>(sql`
      WITH conv AS (
        SELECT c.id,
               c.job_id,
               c.project_id,
               c.quote_id,
               p.status AS project_status,
               q.status AS quote_status,
               j.status AS job_status
          FROM conversations c
          JOIN projects p ON p.id = c.project_id
          LEFT JOIN quotes q ON q.id = c.quote_id
          LEFT JOIN jobs   j ON j.id = c.job_id
         WHERE c.id = ${conversationId}::uuid
      ),
      member AS (
        SELECT m.user_id, m.role
          FROM conversation_members m
         WHERE m.conversation_id = ${conversationId}::uuid
           AND m.user_id = ${session.userId}::uuid
      ),
      msg_count AS (
        SELECT count(*)::int AS n
          FROM messages
         WHERE conversation_id = ${conversationId}::uuid
      ),
      parent_check AS (
        -- Parent must exist and belong to the same conversation. No reply
        -- across threads. Soft-deleted parents are allowed — the UI will
        -- render "Original message deleted" in the reply card.
        SELECT (
          CASE
            WHEN ${parentId}::uuid IS NULL THEN 'OK'
            WHEN NOT EXISTS (
              SELECT 1 FROM messages
               WHERE id = ${parentId}::uuid
                 AND conversation_id = ${conversationId}::uuid
            ) THEN 'PARENT_MISMATCH'
            ELSE 'OK'
          END
        ) AS code
      ),
      classification AS (
        SELECT (
          CASE
            WHEN NOT EXISTS (SELECT 1 FROM conv)   THEN 'NOT_FOUND'
            WHEN NOT EXISTS (SELECT 1 FROM member) THEN 'NOT_MEMBER'
            WHEN (SELECT code FROM parent_check) = 'PARENT_MISMATCH' THEN 'PARENT_MISMATCH'
            WHEN (SELECT job_id FROM conv) IS NULL THEN
              CASE
                WHEN (SELECT project_status FROM conv) NOT IN ('OPEN','QUOTING') THEN 'PROJECT_CLOSED'
                WHEN (SELECT quote_status FROM conv) IS NOT NULL
                  AND (SELECT quote_status FROM conv) <> 'PENDING'             THEN 'QUOTE_INACTIVE'
                WHEN (SELECT role FROM member) = 'CONTRACTOR'
                  AND (SELECT n FROM msg_count) = 0                             THEN 'COLD_OPEN'
                ELSE 'OK'
              END
            ELSE
              CASE
                WHEN (SELECT job_status FROM conv) IN
                     ('COMPLETED','REFUNDED','CANCELLED','SPLIT_SETTLED')       THEN 'JOB_CLOSED'
                ELSE 'OK'
              END
          END
        ) AS code
      ),
      ins AS (
        INSERT INTO messages (conversation_id, sender_id, content, is_flagged, flag_reason, parent_message_id)
        SELECT ${conversationId}::uuid,
               ${session.userId}::uuid,
               ${content}::text,
               ${flagged}::boolean,
               ${primaryReason}::incident_type,
               ${parentId}::uuid
          FROM classification
         WHERE classification.code = 'OK'
        RETURNING *
      ),
      parent_snap AS (
        SELECT
          CASE
            WHEN ${parentId}::uuid IS NULL THEN NULL::jsonb
            ELSE (
              SELECT jsonb_build_object(
                'id',        pm.id,
                'senderId',  pm.sender_id,
                'content',   pm.content,
                'isDeleted', (pm.deleted_at IS NOT NULL),
                'firstAttachmentKind', (
                  SELECT a.kind::text
                    FROM message_attachments a
                   WHERE a.message_id = pm.id
                   ORDER BY a.created_at
                   LIMIT 1
                )
              )
                FROM messages pm
               WHERE pm.id = ${parentId}::uuid
            )
          END AS preview
      ),
      atts_input AS (
        SELECT *
          FROM jsonb_to_recordset(${attachmentsJson}::jsonb) AS x(
            kind         text,
            storage_path text,
            mime         text,
            size_bytes   int,
            duration_ms  int,
            width        int,
            height       int,
            metadata     jsonb
          )
      ),
      atts_ins AS (
        INSERT INTO message_attachments
          (message_id, kind, storage_path, mime, size_bytes, duration_ms, width, height, metadata)
        SELECT ins.id, a.kind::attachment_kind, a.storage_path, a.mime,
               a.size_bytes, a.duration_ms, a.width, a.height, a.metadata
          FROM ins, atts_input a
        RETURNING *
      ),
      atts_agg AS (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id',           atts_ins.id,
              'messageId',    atts_ins.message_id,
              'kind',         atts_ins.kind,
              'storagePath',  atts_ins.storage_path,
              'mime',         atts_ins.mime,
              'sizeBytes',    atts_ins.size_bytes,
              'durationMs',   atts_ins.duration_ms,
              'width',        atts_ins.width,
              'height',       atts_ins.height,
              'metadata',     atts_ins.metadata
            )
            ORDER BY atts_ins.created_at
          ),
          '[]'::jsonb
        ) AS attachments
        FROM atts_ins
      ),
      bump AS (
        UPDATE conversations
           SET last_message_at        = now(),
               last_message_preview   = ${preview}::text,
               last_message_sender_id = ${session.userId}::uuid
         WHERE id = ${conversationId}::uuid
           AND EXISTS (SELECT 1 FROM ins)
        RETURNING 1
      ),
      members_all AS (
        SELECT array_agg(cm.user_id::text) AS user_ids
          FROM conversation_members cm
         WHERE cm.conversation_id = ${conversationId}::uuid
      ),
      other AS (
        SELECT cm.user_id
          FROM conversation_members cm
         WHERE cm.conversation_id = ${conversationId}::uuid
           AND cm.user_id <> ${session.userId}::uuid
         LIMIT 1
      )
      SELECT
        classification.code AS code,
        ins.id,
        ins.conversation_id,
        ins.sender_id,
        ins.content,
        ins.is_flagged,
        ins.flag_reason,
        ins.is_read,
        ins.read_at,
        ins.created_at,
        ins.deleted_at,
        ins.edited_at,
        ins.parent_message_id,
        (SELECT preview FROM parent_snap)  AS parent_preview,
        (SELECT user_id FROM other)       AS other_user_id,
        (SELECT user_ids FROM members_all) AS member_user_ids,
        (SELECT attachments FROM atts_agg) AS attachments_json
      FROM classification
      LEFT JOIN ins ON true
    `)
    rows = result as unknown as SendRow[]
  } catch (err) {
    console.error('[Chat] send db-error', err)
    return { ok: false, error: 'DB_ERROR', message: 'Could not send.' }
  }

  const row = rows[0]
  if (!row) {
    return { ok: false, error: 'DB_ERROR', message: 'No response from database.' }
  }

  if (row.code !== 'OK') {
    return mapClassificationToError(row.code)
  }

  const attachmentsRaw = Array.isArray(row.attachments_json)
    ? (row.attachments_json as Array<{
        id: string
        messageId: string
        kind: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE'
        storagePath: string
        mime: string
        sizeBytes: number
        durationMs: number | null
        width: number | null
        height: number | null
        metadata:
          | {
              resourceType?: 'image' | 'video' | 'raw'
              waveformPeaks?: number[]
              originalFilename?: string
            }
          | null
      }>)
    : []

  const parentPreview = parseParentPreviewPayload(row.parent_preview)

  const payload: SendMessagePayload = {
    id: row.id!,
    conversationId: row.conversation_id!,
    senderId: row.sender_id!,
    kind: 'USER',
    systemPayload: null,
    content: row.content!,
    isFlagged: row.is_flagged!,
    flagReason: row.flag_reason,
    isRead: row.is_read ?? false,
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
    createdAt: new Date(row.created_at!).toISOString(),
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
    editedAt: row.edited_at ? new Date(row.edited_at).toISOString() : null,
    parentMessageId: row.parent_message_id ?? null,
    parentPreview,
    attachments: attachmentsRaw.map((a) => ({
      id: a.id,
      messageId: a.messageId,
      kind: a.kind,
      storagePath: a.storagePath,
      resourceType: a.metadata?.resourceType ?? 'raw',
      mime: a.mime,
      sizeBytes: a.sizeBytes,
      durationMs: a.durationMs,
      width: a.width,
      height: a.height,
      waveformPeaks: a.metadata?.waveformPeaks ?? null,
      originalFilename: a.metadata?.originalFilename ?? null,
    })),
  }

  // Realtime fanout — fire-and-forget REST broadcasts. We call the
  // endpoint in parallel for the thread stream AND for each member's
  // inbox topic. The DB insert is already committed; if a broadcast
  // fails for any reason, the receiver picks it up on next page load
  // (the row is in Postgres).
  const memberIds = row.member_user_ids ?? []
  const broadcastMessages: Array<{
    topic: string
    event: string
    payload: unknown
  }> = [
    {
      topic: `chat:${payload.conversationId}`,
      event: 'message:new',
      payload,
    },
    ...memberIds.map((uid) => ({
      topic: `user:${uid}`,
      event: 'conversation:bumped',
      payload: {
        conversationId: payload.conversationId,
        preview,
        senderId: payload.senderId,
        at: payload.createdAt,
      },
    })),
  ]
  void sendRealtimeBroadcast(broadcastMessages).catch((e) =>
    console.error('[Chat] broadcast threw', e),
  )

  // Fire-and-forget: incidents + notification throttling. These never block
  // the response.
  if (flagged && primaryReason) {
    void db
      .insert(incidents)
      .values({
        userId: session.userId,
        incidentType: primaryReason,
        messageId: payload.id,
        rawContent: content,
      })
      .catch((e) => console.error('[Chat] incident insert failed', e))
  }

  if (row.other_user_id) {
    void notifyOtherParty({
      recipientUserId: row.other_user_id,
      senderUserId: session.userId,
      conversationId,
      preview: content.slice(0, 120),
    }).catch((e) => console.error('[Chat] notify threw', e))
  }

  console.log('[Chat] send', {
    conversationId,
    messageId: payload.id,
    flagged,
    reasons,
    tookMs: Date.now() - t0,
  })

  // Phase 4 — fire-and-forget AI sentiment scan, debounced per
  // conversation (10-minute window) inside the Inngest function.
  // Skipped for messages that look like attachments only (no text).
  if (content && content.trim().length > 0) {
    const { inngest, INNGEST_EVENTS } = await import('@/lib/inngest/client')
    void inngest
      .send({
        name: INNGEST_EVENTS.CHAT_SENTIMENT_REQUESTED,
        data: { conversationId },
      })
      .catch((e) => console.error('[Chat] sentiment-emit-failed', e))
  }

  // First-response signal + two-way activity heartbeat. Cheap, idempotent.
  // Only meaningful pre-hire (no jobId yet); skips post-hire conversations.
  void recordLeadActivityFromMessage({
    conversationId,
    senderUserId: session.userId,
  }).catch((e) => console.error('[Chat] lead-activity-failed', e))

  return {
    ok: true,
    message: payload,
    flagged,
    reasons,
  }
}

/**
 * Pre-hire chat side-effects on the lead row:
 *  1. firstResponseAt — set on first contractor message (drives 24h soft signal).
 *  2. lastTwoWayActivityAt — set when both sides have a kind=USER message
 *     in the rolling 7d window (drives the new inactivity expiry rule).
 *
 * Both are idempotent: setting `firstResponseAt` is guarded by IS NULL,
 * setting `lastTwoWayActivityAt` is always a fresh `now()` so it advances
 * monotonically with each qualifying exchange.
 */
async function recordLeadActivityFromMessage(args: {
  conversationId: string
  senderUserId: string
}) {
  const { conversations, contractorProfiles, homeownerProfiles, leads, messages } =
    await import('@/lib/db/schema')
  const { isNull, eq, and, desc, gt } = await import('drizzle-orm')

  const [convo] = await db
    .select({
      jobId: conversations.jobId,
      conversationId: conversations.id,
      contractorUserId: contractorProfiles.userId,
      contractorProfileId: conversations.contractorId,
      homeownerUserId: homeownerProfiles.userId,
      projectId: conversations.projectId,
    })
    .from(conversations)
    .innerJoin(
      contractorProfiles,
      eq(contractorProfiles.id, conversations.contractorId),
    )
    .innerJoin(
      homeownerProfiles,
      eq(homeownerProfiles.id, conversations.homeownerId),
    )
    .where(eq(conversations.id, args.conversationId))
    .limit(1)
  if (!convo) return
  // Only relevant pre-hire — once a job exists, the inactivity rule no
  // longer governs the lead.
  if (convo.jobId) return

  const isPainter = convo.contractorUserId === args.senderUserId
  const isHomeowner = convo.homeownerUserId === args.senderUserId
  if (!isPainter && !isHomeowner) return

  // 1) First-response — painter side only.
  if (isPainter) {
    await db
      .update(leads)
      .set({ firstResponseAt: new Date() })
      .where(
        and(
          eq(leads.contractorId, convo.contractorProfileId),
          eq(leads.projectId, convo.projectId),
          isNull(leads.firstResponseAt),
        ),
      )
  }

  // 2) Two-way activity — only set if the OTHER side has a kind=USER
  // message on this conversation in the last 7d. Otherwise this is a
  // one-sided exchange (the failure mode we explicitly do NOT reward).
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const otherUserId = isPainter ? convo.homeownerUserId : convo.contractorUserId
  if (!otherUserId) return
  const [otherSide] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, convo.conversationId),
        eq(messages.senderId, otherUserId),
        eq(messages.kind, 'USER'),
        gt(messages.createdAt, sevenDaysAgo),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(1)
  if (!otherSide) return

  // Bump the heartbeat. Also push expires_at forward so legacy
  // event-driven jobs that still gate on expires_at don't fire mid-chat.
  const now = new Date()
  const { LEAD_TUNABLES } = await import('@/lib/config/tunables')
  await db
    .update(leads)
    .set({
      lastTwoWayActivityAt: now,
      expiresAt: new Date(
        now.getTime() + LEAD_TUNABLES.INACTIVITY_EXPIRY_HOURS * 60 * 60 * 1000,
      ),
    })
    .where(
      and(
        eq(leads.contractorId, convo.contractorProfileId),
        eq(leads.projectId, convo.projectId),
      ),
    )
}

function parseParentPreviewPayload(
  raw: unknown,
): MessageParentPreviewPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as {
    id?: string
    senderId?: string
    content?: string
    isDeleted?: boolean
    firstAttachmentKind?: string | null
  }
  if (!r.id || !r.senderId) return null
  const kind = r.firstAttachmentKind
  return {
    id: r.id,
    senderId: r.senderId,
    content: r.content ?? '',
    isDeleted: Boolean(r.isDeleted),
    firstAttachmentKind:
      kind === 'IMAGE' || kind === 'AUDIO' || kind === 'VIDEO' || kind === 'FILE'
        ? kind
        : null,
  }
}

function mapClassificationToError(code: ClassificationCode): SendMessageResult {
  switch (code) {
    case 'NOT_FOUND':
      return { ok: false, error: 'NOT_FOUND', message: 'Conversation not found.' }
    case 'NOT_MEMBER':
      return {
        ok: false,
        error: 'NOT_MEMBER',
        message: 'You are not a member of this conversation.',
      }
    case 'PARENT_MISMATCH':
      return {
        ok: false,
        error: 'PARENT_MISMATCH',
        message: 'That message is not in this conversation.',
      }
    case 'PROJECT_CLOSED':
      return {
        ok: false,
        error: 'NOT_ACTIONABLE',
        message: 'The homeowner has closed this project — chat is read-only.',
      }
    case 'QUOTE_INACTIVE':
      return {
        ok: false,
        error: 'NOT_ACTIONABLE',
        message: 'This quote is no longer active — chat is read-only.',
      }
    case 'COLD_OPEN':
      return {
        ok: false,
        error: 'NOT_ACTIONABLE',
        message:
          'Wait for the homeowner to reach out first. You can respond once they do.',
      }
    case 'JOB_CLOSED':
      return {
        ok: false,
        error: 'NOT_ACTIONABLE',
        message: 'This job is closed — chat is read-only.',
      }
    default:
      return { ok: false, error: 'DB_ERROR', message: 'Could not send.' }
  }
}

// ============================================================
// markConversationReadAction
//
// Updates conversation_members.last_read_at. Membership is implicit —
// the UPDATE only touches the row for (conversationId, userId); if the
// user isn't a member, zero rows are updated and we return `markedCount: 0`.
// ============================================================

export type MarkReadResult =
  | Ok<{ markedCount: number }>
  | Fail<'UNAUTHENTICATED' | 'DB_ERROR'>

export async function markConversationReadAction(
  conversationId: string,
): Promise<MarkReadResult> {
  const session = await getFastSession()
  if (!session) {
    return { ok: false, error: 'UNAUTHENTICATED', message: 'Please sign in.' }
  }

  try {
    const rows = await db.execute<{ user_id: string }>(sql`
      UPDATE conversation_members
         SET last_read_at = now()
       WHERE conversation_id = ${conversationId}::uuid
         AND user_id         = ${session.userId}::uuid
      RETURNING user_id
    `)
    const markedCount = (rows as unknown as { user_id: string }[]).length
    return { ok: true, markedCount }
  } catch (err) {
    console.error('[Chat] markRead db-error', err)
    return { ok: false, error: 'DB_ERROR', message: 'Could not update.' }
  }
}

// ============================================================
// loadOlderMessagesAction — unchanged pagination
// ============================================================

type LoadOlderPayload = {
  id: string
  conversationId: string
  senderId: string
  content: string
  isFlagged: boolean
  flagReason:
    | 'PHONE_NUMBER'
    | 'EMAIL_ADDRESS'
    | 'EXTERNAL_APP'
    | 'SOCIAL_HANDLE'
    | null
  isRead: boolean
  readAt: string | null
  createdAt: string
  deletedAt: string | null
  editedAt: string | null
  parentMessageId: string | null
  parentPreview: MessageParentPreviewPayload | null
  attachments: MessageAttachmentPayload[]
}

export async function loadOlderMessagesAction(
  conversationId: string,
  beforeCursorIso: string,
): Promise<
  | { ok: true; messages: LoadOlderPayload[]; hasMore: boolean }
  | { ok: false; error: 'NOT_MEMBER' | 'INVALID_INPUT' | 'UNAUTHENTICATED' }
> {
  const session = await getFastSession()
  if (!session) return { ok: false, error: 'UNAUTHENTICATED' }

  // Membership check: is the user in this conversation? One round-trip.
  const mem = (await db.execute<{ ok: number }>(sql`
    SELECT 1 AS ok FROM conversation_members
     WHERE conversation_id = ${conversationId}::uuid
       AND user_id         = ${session.userId}::uuid
     LIMIT 1
  `)) as unknown as { ok: number }[]
  if (mem.length === 0) return { ok: false, error: 'NOT_MEMBER' }

  if (!beforeCursorIso || Number.isNaN(Date.parse(beforeCursorIso))) {
    return { ok: false, error: 'INVALID_INPUT' }
  }

  const { messages: page, hasMore } = await listMessagesPaged(conversationId, {
    beforeCursor: beforeCursorIso,
    limit: 40,
  })

  return {
    ok: true,
    hasMore,
    messages: page.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      isFlagged: m.isFlagged,
      flagReason: m.flagReason,
      isRead: m.isRead,
      readAt: m.readAt ? m.readAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
      deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
      editedAt: m.editedAt ? m.editedAt.toISOString() : null,
      parentMessageId: m.parentMessageId,
      parentPreview: m.parentPreview,
      attachments: m.attachments.map((a) => ({
        id: a.id,
        messageId: a.messageId,
        kind: a.kind,
        storagePath: a.storagePath,
        resourceType: a.resourceType,
        mime: a.mime,
        sizeBytes: a.sizeBytes,
        durationMs: a.durationMs,
        width: a.width,
        height: a.height,
        waveformPeaks: a.waveformPeaks,
        originalFilename: a.originalFilename,
      })),
    })),
  }
}

// ============================================================
// editMessageAction — update own message content
//
// Like delete but in-place: updates `content` + `edited_at`, then
// broadcasts `message:edited` on chat:{id} with the new content so
// every subscriber reconciles. Re-runs the leakage scan on the new
// content (the moderation guarantee has to survive edits).
//
// Intentionally NOT re-broadcasting on the user:{id} inbox for sidebar
// preview — edits of non-latest messages shouldn't disturb the preview.
// A future polish pass can detect "this was the latest message" and
// update preview too.
// ============================================================

const editInputSchema = z.object({
  content: z.string().trim().min(1, 'Message is required').max(2000),
})

export type EditMessageResult =
  | Ok<{
      messageId: string
      conversationId: string
      content: string
      editedAt: string
      isFlagged: boolean
      flagReason: SendMessagePayload['flagReason']
    }>
  | Fail<
      | 'UNAUTHENTICATED'
      | 'INVALID_INPUT'
      | 'NOT_FOUND'
      | 'NOT_OWNER'
      | 'NOT_EDITABLE'
      | 'DB_ERROR'
    >

export async function editMessageAction(
  messageId: string,
  rawContent: string,
): Promise<EditMessageResult> {
  const session = await getFastSession()
  if (!session) {
    return { ok: false, error: 'UNAUTHENTICATED', message: 'Please sign in.' }
  }

  const parsed = editInputSchema.safeParse({ content: rawContent })
  if (!parsed.success) {
    return {
      ok: false,
      error: 'INVALID_INPUT',
      message: parsed.error.issues[0]?.message ?? 'Invalid message.',
    }
  }
  const content = parsed.data.content

  // Leakage scan on the new text — edits have to pass moderation too.
  const { flagged, reasons } = scanLeakage(content)
  const primaryReason = reasons[0] ?? null

  let rows: Array<{
    id: string
    conversation_id: string
    content: string
    edited_at: Date | string
    is_flagged: boolean
    flag_reason: SendMessagePayload['flagReason']
  }>
  try {
    rows = (await db.execute<{
      id: string
      conversation_id: string
      content: string
      edited_at: Date | string
      is_flagged: boolean
      flag_reason: SendMessagePayload['flagReason']
    }>(sql`
      UPDATE messages
         SET content     = ${content},
             is_flagged  = ${flagged}::boolean,
             flag_reason = ${primaryReason}::incident_type,
             edited_at   = now()
       WHERE id = ${messageId}::uuid
         AND sender_id  = ${session.userId}::uuid
         AND deleted_at IS NULL
      RETURNING id, conversation_id, content, edited_at, is_flagged, flag_reason
    `)) as unknown as Array<{
      id: string
      conversation_id: string
      content: string
      edited_at: Date | string
      is_flagged: boolean
      flag_reason: SendMessagePayload['flagReason']
    }>
  } catch (err) {
    console.error('[Chat] edit db-error', err)
    return { ok: false, error: 'DB_ERROR', message: 'Could not edit.' }
  }

  const row = rows[0]
  if (!row) {
    return {
      ok: false,
      error: 'NOT_OWNER',
      message: "You can only edit your own messages.",
    }
  }

  const editedAtIso =
    row.edited_at instanceof Date
      ? row.edited_at.toISOString()
      : new Date(row.edited_at).toISOString()

  // Flagged edits still deliver — incidents row for admin review.
  if (flagged && primaryReason) {
    void db
      .insert(incidents)
      .values({
        userId: session.userId,
        incidentType: primaryReason,
        messageId: row.id,
        rawContent: content,
      })
      .catch((e) => console.error('[Chat] edit incident insert failed', e))
  }

  void sendRealtimeBroadcast({
    topic: `chat:${row.conversation_id}`,
    event: 'message:edited',
    payload: {
      messageId: row.id,
      conversationId: row.conversation_id,
      content: row.content,
      editedAt: editedAtIso,
      isFlagged: row.is_flagged,
      flagReason: row.flag_reason,
    },
  }).catch((e) => console.error('[Chat] edit broadcast threw', e))

  return {
    ok: true,
    messageId: row.id,
    conversationId: row.conversation_id,
    content: row.content,
    editedAt: editedAtIso,
    isFlagged: row.is_flagged,
    flagReason: row.flag_reason,
  }
}

// ============================================================
// deleteMessageAction — soft-delete own message + broadcast
//
// Sets `deleted_at = now()` on messages the caller authored. Broadcasts
// `message:deleted` on both chat:{id} and user:{memberId} so every
// subscriber can reconcile. Attachment rows stay (referenced by
// deleted messages) — the Cloudinary blobs are kept too since we
// preserve audit history. A future admin job can hard-purge after N
// days.
// ============================================================

export type DeleteMessageResult =
  | Ok<{ messageId: string; conversationId: string }>
  | Fail<'UNAUTHENTICATED' | 'NOT_FOUND' | 'NOT_OWNER' | 'DB_ERROR'>

export async function deleteMessageAction(
  messageId: string,
): Promise<DeleteMessageResult> {
  const session = await getFastSession()
  if (!session) {
    return { ok: false, error: 'UNAUTHENTICATED', message: 'Please sign in.' }
  }

  let rows: { id: string; conversation_id: string }[]
  try {
    rows = (await db.execute<{ id: string; conversation_id: string }>(sql`
      UPDATE messages
         SET deleted_at = now()
       WHERE id = ${messageId}::uuid
         AND sender_id = ${session.userId}::uuid
         AND deleted_at IS NULL
      RETURNING id, conversation_id
    `)) as unknown as { id: string; conversation_id: string }[]
  } catch (err) {
    console.error('[Chat] delete db-error', err)
    return { ok: false, error: 'DB_ERROR', message: 'Could not delete.' }
  }

  const row = rows[0]
  if (!row) {
    // Either the message doesn't exist, isn't ours, or is already deleted.
    return {
      ok: false,
      error: 'NOT_OWNER',
      message: "You can only delete your own messages.",
    }
  }

  // Who are the members? Need to broadcast to each member's inbox for
  // the sidebar preview fix-up if the deleted message was the latest.
  const members = (await db.execute<{ user_id: string }>(sql`
    SELECT user_id FROM conversation_members
     WHERE conversation_id = ${row.conversation_id}::uuid
  `)) as unknown as { user_id: string }[]

  const broadcasts: Array<{ topic: string; event: string; payload: unknown }> = [
    {
      topic: `chat:${row.conversation_id}`,
      event: 'message:deleted',
      payload: { messageId: row.id, conversationId: row.conversation_id },
    },
    ...members.map((m) => ({
      topic: `user:${m.user_id}`,
      event: 'conversation:touched',
      payload: { conversationId: row.conversation_id },
    })),
  ]
  void sendRealtimeBroadcast(broadcasts).catch((e) =>
    console.error('[Chat] delete broadcast threw', e),
  )

  return { ok: true, messageId: row.id, conversationId: row.conversation_id }
}

// ============================================================
// getMessagesAfterAction — catch-up fetch when a client detects the
// SSR / Next.js Link-prefetch payload was stale (a message arrived
// between prefetch and user click). The chat:{id} realtime channel
// only delivers messages that arrive AFTER subscribe, so anything in
// the gap must be reconciled via this action.
// ============================================================

type MessageAfterPayload = {
  id: string
  conversationId: string
  senderId: string
  content: string
  isFlagged: boolean
  flagReason:
    | 'PHONE_NUMBER'
    | 'EMAIL_ADDRESS'
    | 'EXTERNAL_APP'
    | 'SOCIAL_HANDLE'
    | null
  isRead: boolean
  readAt: string | null
  createdAt: string
  deletedAt: string | null
  editedAt: string | null
  parentMessageId: string | null
  parentPreview: MessageParentPreviewPayload | null
  attachments: MessageAttachmentPayload[]
}

export async function getMessagesAfterAction(
  conversationId: string,
  afterCursorIso: string | null,
): Promise<
  | { ok: true; messages: MessageAfterPayload[] }
  | { ok: false; error: 'NOT_MEMBER' | 'UNAUTHENTICATED' | 'INVALID_INPUT' }
> {
  const session = await getFastSession()
  if (!session) return { ok: false, error: 'UNAUTHENTICATED' }

  const mem = (await db.execute<{ ok: number }>(sql`
    SELECT 1 AS ok FROM conversation_members
     WHERE conversation_id = ${conversationId}::uuid
       AND user_id         = ${session.userId}::uuid
     LIMIT 1
  `)) as unknown as { ok: number }[]
  if (mem.length === 0) return { ok: false, error: 'NOT_MEMBER' }

  if (afterCursorIso && Number.isNaN(Date.parse(afterCursorIso))) {
    return { ok: false, error: 'INVALID_INPUT' }
  }

  const rows = (await db.execute<{
    id: string
    conversation_id: string
    sender_id: string
    content: string
    is_flagged: boolean
    flag_reason: MessageAfterPayload['flagReason']
    is_read: boolean
    read_at: Date | null
    created_at: Date
    deleted_at: Date | null
    edited_at: Date | null
    parent_message_id: string | null
    parent_preview: unknown
    attachments: unknown
  }>(sql`
    SELECT m.id, m.conversation_id, m.sender_id, m.content, m.is_flagged,
           m.flag_reason, m.is_read, m.read_at, m.created_at, m.deleted_at,
           m.edited_at, m.parent_message_id,
           CASE
             WHEN m.parent_message_id IS NULL OR pm.id IS NULL THEN NULL::jsonb
             ELSE jsonb_build_object(
               'id',        pm.id,
               'senderId',  pm.sender_id,
               'content',   pm.content,
               'isDeleted', (pm.deleted_at IS NOT NULL),
               'firstAttachmentKind', (
                 SELECT a.kind::text
                   FROM message_attachments a
                  WHERE a.message_id = pm.id
                  ORDER BY a.created_at
                  LIMIT 1
               )
             )
           END AS parent_preview,
           coalesce(
             (SELECT jsonb_agg(
                jsonb_build_object(
                  'id',           a.id,
                  'messageId',    a.message_id,
                  'kind',         a.kind,
                  'storagePath',  a.storage_path,
                  'mime',         a.mime,
                  'sizeBytes',    a.size_bytes,
                  'durationMs',   a.duration_ms,
                  'width',        a.width,
                  'height',       a.height,
                  'metadata',     a.metadata
                ) ORDER BY a.created_at
              )
              FROM message_attachments a
              WHERE a.message_id = m.id),
             '[]'::jsonb
           ) AS attachments
      FROM messages m
      LEFT JOIN messages pm ON pm.id = m.parent_message_id
     WHERE m.conversation_id = ${conversationId}::uuid
       ${afterCursorIso
        ? sql`AND m.created_at > ${afterCursorIso}::timestamptz`
        : sql``}
     ORDER BY m.created_at ASC
     LIMIT 100
  `)) as unknown as Array<{
    id: string
    conversation_id: string
    sender_id: string
    content: string
    is_flagged: boolean
    flag_reason: MessageAfterPayload['flagReason']
    is_read: boolean
    read_at: Date | null
    created_at: Date
    deleted_at: Date | null
    edited_at: Date | null
    parent_message_id: string | null
    parent_preview: unknown
    attachments: unknown
  }>

  return {
    ok: true,
    messages: rows.map((r) => {
      const raw = Array.isArray(r.attachments)
        ? (r.attachments as Array<{
            id: string
            messageId: string
            kind: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE'
            storagePath: string
            mime: string
            sizeBytes: number
            durationMs: number | null
            width: number | null
            height: number | null
            metadata:
              | {
                  resourceType?: 'image' | 'video' | 'raw'
                  waveformPeaks?: number[]
                  originalFilename?: string
                }
              | null
          }>)
        : []
      return {
        id: r.id,
        conversationId: r.conversation_id,
        senderId: r.sender_id,
        content: r.content,
        isFlagged: r.is_flagged,
        flagReason: r.flag_reason,
        isRead: r.is_read,
        readAt: r.read_at ? new Date(r.read_at).toISOString() : null,
        createdAt: new Date(r.created_at).toISOString(),
        deletedAt: r.deleted_at ? new Date(r.deleted_at).toISOString() : null,
        editedAt: r.edited_at ? new Date(r.edited_at).toISOString() : null,
        parentMessageId: r.parent_message_id,
        parentPreview: parseParentPreviewPayload(r.parent_preview),
        attachments: raw.map((a) => ({
          id: a.id,
          messageId: a.messageId,
          kind: a.kind,
          storagePath: a.storagePath,
          resourceType: a.metadata?.resourceType ?? 'raw',
          mime: a.mime,
          sizeBytes: a.sizeBytes,
          durationMs: a.durationMs,
          width: a.width,
          height: a.height,
          waveformPeaks: a.metadata?.waveformPeaks ?? null,
          originalFilename: a.metadata?.originalFilename ?? null,
        })),
      }
    }),
  }
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Presence-aware MESSAGE notification.
 *
 * Decides which channels to fire based on where the recipient is right now.
 * Modeled on Slack/Upwork — the principle is "escalate channels as the user's
 * distance from the platform grows; don't ping someone twice on the same
 * device they're already looking at."
 *
 * Channel matrix:
 *
 *   muted                 → nothing
 *   viewing               → nothing (the chat broadcast already shows it)
 *   on_platform           → in-app only, throttled to 1 per 2 min per conversation
 *   recently_away (2-15m) → in-app row + push (no email — digest worker handles)
 *   away (>15m)           → in-app row + push + flagged for digest email
 *
 * The in-app row is always written for `recently_away` and `away` so the
 * bell shows the count when the user returns. The Phase 4.4.b email digest
 * cron picks up unread + unmailed rows older than 15 min and bundles them.
 */
async function notifyOtherParty(args: {
  recipientUserId: string
  senderUserId: string
  conversationId: string
  preview: string
}): Promise<void> {
  const [sender] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, args.senderUserId))
    .limit(1)
  const senderName = sender?.fullName ?? 'Someone'

  const state = await getRecipientState(args.recipientUserId, args.conversationId)

  // Hard short-circuits — nothing to send.
  if (state === 'muted' || state === 'viewing') {
    return
  }

  // On-platform throttle: if there's already an unread MESSAGE notification
  // for this conversation in the last 2 min, skip a second toast — the bell
  // is already surfacing one. Only applies to the on_platform path; away
  // paths always get push so the OS can group them.
  if (state === 'on_platform') {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000)
    const [recent] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, args.recipientUserId),
          eq(notifications.type, 'MESSAGE'),
          eq(notifications.entityId, args.conversationId),
          eq(notifications.isRead, false),
          gt(notifications.createdAt, twoMinAgo),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(1)
    if (recent) return
  }

  const actionUrl = await buildMessageActionUrl(
    args.recipientUserId,
    args.conversationId,
  )

  // Email is *never* sent inline for chat — the digest cron in
  // src/lib/inngest/functions/message-digest.ts collects unread MESSAGE
  // rows older than 15 min and ships one bundled email per recipient.
  // Push fires immediately when the user isn't actively on platform.
  await sendNotification({
    userId: args.recipientUserId,
    type: 'MESSAGE',
    title: `New message from ${senderName}`,
    body: args.preview,
    actionUrl,
    entityType: 'MESSAGE',
    entityId: args.conversationId,
    sendSms: false,
    sendEmail: false,
    sendPush: state !== 'on_platform',  // suppress push when already on platform
    sendInApp: true,
  })
}

async function buildMessageActionUrl(
  userId: string,
  conversationId: string,
): Promise<string> {
  const [u] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const role = u?.role === 'HOMEOWNER' ? 'homeowner' : 'contractor'
  return `/${role}/messages/${conversationId}`
}
