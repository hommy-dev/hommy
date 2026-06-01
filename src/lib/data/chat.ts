import { and, asc, desc, eq, inArray, lt, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contractorProfiles,
  conversationMembers,
  conversations,
  homeownerProfiles,
  jobs,
  messages,
  projects,
  quotes,
  users,
} from '@/lib/db/schema'

export type MessageAttachmentRow = {
  id: string
  messageId: string
  kind: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE'
  storagePath: string                       // Cloudinary public_id
  resourceType: 'image' | 'video' | 'raw'
  mime: string
  sizeBytes: number
  durationMs: number | null
  width: number | null
  height: number | null
  waveformPeaks: number[] | null
  originalFilename: string | null
}

export type MessageParentPreview = {
  id: string
  senderId: string
  /** Raw content of the parent at write time. May be empty if parent is
   *  attachment-only. UI falls back to firstAttachmentKind for display. */
  content: string
  /** True if the parent has been soft-deleted. UI renders a
   *  "Original message deleted" placeholder when so. */
  isDeleted: boolean
  /** Kind of the parent's first attachment, if any. Lets the reply card
   *  show "📷 Photo" / "🎥 Video" without fetching attachments eagerly. */
  firstAttachmentKind: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE' | null
}

/**
 * Discriminator for chat messages. USER messages are typed by humans;
 * SYSTEM messages are emitted by server actions to mark state changes
 * (quote.submitted, walkthrough.requested, etc.) and render as
 * inline-action bubbles in the same conversation thread.
 */
export type MessageKind = 'USER' | 'SYSTEM'

export type MessageRow = {
  id: string
  conversationId: string
  senderId: string
  kind: MessageKind
  /** SYSTEM-only payload: { type, ...args } shaped per kind. Null for USER rows. */
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
  readAt: Date | null
  createdAt: Date
  deletedAt: Date | null
  editedAt: Date | null
  /** Non-null when this row is a reply. `parentPreview` carries a snapshot
   *  of the parent sufficient for the reply card — avoids a round trip
   *  per row. Null when the parent has been hard-purged (FK ON DELETE SET NULL). */
  parentMessageId: string | null
  parentPreview: MessageParentPreview | null
  attachments: MessageAttachmentRow[]
}

export type ConversationRow = {
  id: string
  projectId: string
  quoteId: string | null
  jobId: string | null
  homeownerId: string
  contractorId: string
  homeownerUserId: string
  contractorUserId: string
  // denormalized display
  projectTitle: string
  projectJobType: string
  projectCity: string
  projectState: string
  contractorBusinessName: string
  contractorAvatarUrl: string | null
  homeownerFullName: string
  homeownerAvatarUrl: string | null
  // lifecycle
  projectStatus: string
  quoteStatus: string | null
  quoteValidUntil: Date | null
  jobStatus: string | null
  lastMessageAt: Date | null
  createdAt: Date
  lastMessagePreview: string | null
  unreadCountForMe: number
}

/**
 * Resolve the membership identities of a conversation for a given user.
 * Returns null when the conversation doesn't exist or the user isn't a member.
 * This is the single gate used by every chat server action + detail page.
 */
export async function getConversationMembership(
  conversationId: string,
  userId: string,
): Promise<{
  conversationId: string
  projectId: string
  quoteId: string | null
  jobId: string | null
  homeownerProfileId: string
  contractorProfileId: string
  homeownerUserId: string
  contractorUserId: string
  isHomeowner: boolean
  isContractor: boolean
  projectStatus: string
  quoteStatus: string | null
  jobStatus: string | null
} | null> {
  const [row] = await db
    .select({
      id: conversations.id,
      projectId: conversations.projectId,
      quoteId: conversations.quoteId,
      jobId: conversations.jobId,
      homeownerProfileId: conversations.homeownerId,
      contractorProfileId: conversations.contractorId,
      homeownerUserId: homeownerProfiles.userId,
      contractorUserId: contractorProfiles.userId,
      projectStatus: projects.status,
      quoteStatus: quotes.status,
      jobStatus: jobs.status,
    })
    .from(conversations)
    .innerJoin(projects, eq(projects.id, conversations.projectId))
    .innerJoin(
      homeownerProfiles,
      eq(homeownerProfiles.id, conversations.homeownerId),
    )
    .innerJoin(
      contractorProfiles,
      eq(contractorProfiles.id, conversations.contractorId),
    )
    .leftJoin(quotes, eq(quotes.id, conversations.quoteId))
    .leftJoin(jobs, eq(jobs.id, conversations.jobId))
    .where(eq(conversations.id, conversationId))
    .limit(1)

  if (!row) return null

  const isHomeowner = row.homeownerUserId === userId
  const isContractor = row.contractorUserId === userId
  if (!isHomeowner && !isContractor) return null

  return {
    conversationId: row.id,
    projectId: row.projectId,
    quoteId: row.quoteId,
    jobId: row.jobId,
    homeownerProfileId: row.homeownerProfileId,
    contractorProfileId: row.contractorProfileId,
    homeownerUserId: row.homeownerUserId,
    contractorUserId: row.contractorUserId,
    isHomeowner,
    isContractor,
    projectStatus: row.projectStatus,
    quoteStatus: row.quoteStatus,
    jobStatus: row.jobStatus,
  }
}

/**
 * List conversations a user is a party to (either side). Ordered by most
 * recent activity. Single indexed query — everything is served from the
 * denormalized columns on `conversations` and the user's own row in
 * `conversation_members`.
 *
 * Unread count is computed as:
 *   messages where created_at > conversation_members.last_read_at
 *     AND sender_id <> me
 *
 * That's a lateral subquery hitting the (conversation_id, created_at) index.
 */
export async function listConversationsForUser(userId: string) {
  // One query, N rows. All joins are 1:1 against small tables. The lateral
  // subquery for unread uses the (conversation_id, created_at) index.
  const rows = await db
    .select({
      id: conversations.id,
      projectId: conversations.projectId,
      quoteId: conversations.quoteId,
      jobId: conversations.jobId,
      homeownerProfileId: conversations.homeownerId,
      contractorProfileId: conversations.contractorId,
      homeownerUserId: homeownerProfiles.userId,
      contractorUserId: contractorProfiles.userId,
      projectTitle: projects.title,
      projectJobType: projects.jobType,
      projectCity: projects.city,
      projectState: projects.state,
      projectStatus: projects.status,
      contractorBusinessName: contractorProfiles.businessName,
      contractorUserFullName: users.fullName,
      contractorUserAvatarUrl: users.avatarUrl,
      quoteStatus: quotes.status,
      quoteValidUntil: quotes.validUntil,
      jobStatus: jobs.status,
      lastMessageAt: conversations.lastMessageAt,
      lastMessagePreview: conversations.lastMessagePreview,
      lastMessageSenderId: conversations.lastMessageSenderId,
      createdAt: conversations.createdAt,
      myLastReadAt: conversationMembers.lastReadAt,
      unreadCount: sql<number>`
        (SELECT count(*)::int FROM ${messages} m
          WHERE m.conversation_id = ${conversations.id}
            AND m.sender_id <> ${userId}::uuid
            AND (${conversationMembers.lastReadAt} IS NULL
                 OR m.created_at > ${conversationMembers.lastReadAt}))
      `.as('unread_count'),
    })
    .from(conversations)
    .innerJoin(projects, eq(projects.id, conversations.projectId))
    .innerJoin(
      homeownerProfiles,
      eq(homeownerProfiles.id, conversations.homeownerId),
    )
    .innerJoin(
      contractorProfiles,
      eq(contractorProfiles.id, conversations.contractorId),
    )
    .innerJoin(users, eq(users.id, contractorProfiles.userId))
    .innerJoin(
      conversationMembers,
      and(
        eq(conversationMembers.conversationId, conversations.id),
        eq(conversationMembers.userId, userId),
      ),
    )
    .leftJoin(quotes, eq(quotes.id, conversations.quoteId))
    .leftJoin(jobs, eq(jobs.id, conversations.jobId))
    .where(
      or(
        eq(homeownerProfiles.userId, userId),
        eq(contractorProfiles.userId, userId),
      ),
    )
    .orderBy(
      desc(sql`coalesce(${conversations.lastMessageAt}, ${conversations.createdAt})`),
    )
    .limit(100)

  if (rows.length === 0) return []

  // Homeowner display — parallel fetch so we don't serialize on this.
  const homeownerUserIds = Array.from(
    new Set(rows.map((r) => r.homeownerUserId).filter(Boolean)),
  )
  const homeownerDisplay = homeownerUserIds.length
    ? await db
        .select({
          id: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(inArray(users.id, homeownerUserIds))
    : []
  const homeownerMap = new Map(homeownerDisplay.map((u) => [u.id, u]))

  return rows.map<ConversationRow>((r) => {
    const ho = homeownerMap.get(r.homeownerUserId)
    return {
      id: r.id,
      projectId: r.projectId,
      quoteId: r.quoteId,
      jobId: r.jobId,
      homeownerId: r.homeownerProfileId,
      contractorId: r.contractorProfileId,
      homeownerUserId: r.homeownerUserId,
      contractorUserId: r.contractorUserId,
      projectTitle: r.projectTitle,
      projectJobType: r.projectJobType,
      projectCity: r.projectCity,
      projectState: r.projectState,
      contractorBusinessName: r.contractorBusinessName,
      contractorAvatarUrl: r.contractorUserAvatarUrl,
      homeownerFullName: ho?.fullName ?? '',
      homeownerAvatarUrl: ho?.avatarUrl ?? null,
      projectStatus: r.projectStatus,
      quoteStatus: r.quoteStatus,
      quoteValidUntil: r.quoteValidUntil,
      jobStatus: r.jobStatus,
      lastMessageAt: r.lastMessageAt,
      createdAt: r.createdAt,
      lastMessagePreview: r.lastMessagePreview,
      unreadCountForMe: Number(r.unreadCount ?? 0),
    }
  })
}

/**
 * One conversation detail for a user. Enforces membership.
 */
export async function getConversationForUser(
  conversationId: string,
  userId: string,
): Promise<ConversationRow | null> {
  const all = await listConversationsForUser(userId)
  return all.find((c) => c.id === conversationId) ?? null
}

/**
 * Paginated message history. Cursor is a `createdAt` ISO string; we return
 * messages strictly before the cursor. Initial load uses cursor = null and
 * returns the newest `limit` messages.
 *
 * Each message carries its attachments (typically zero for text-only).
 * Fetched with one LEFT JOIN + jsonb_agg per message so N+1 is not a
 * concern.
 */
export async function listMessagesPaged(
  conversationId: string,
  options: { limit?: number; beforeCursor?: string | null } = {},
): Promise<{ messages: MessageRow[]; hasMore: boolean }> {
  const limit = Math.min(Math.max(options.limit ?? 40, 1), 100)
  const cursor = options.beforeCursor ? new Date(options.beforeCursor).toISOString() : null

  const rows = (await db.execute<{
    id: string
    conversation_id: string
    sender_id: string
    kind: MessageKind
    system_payload: unknown
    content: string
    is_flagged: boolean
    flag_reason: MessageRow['flagReason']
    is_read: boolean
    read_at: Date | string | null
    created_at: Date | string
    deleted_at: Date | string | null
    edited_at: Date | string | null
    parent_message_id: string | null
    parent_preview: unknown
    attachments: unknown
  }>(sql`
    SELECT m.id, m.conversation_id, m.sender_id, m.kind::text AS kind,
           m.system_payload, m.content, m.is_flagged, m.flag_reason,
           m.is_read, m.read_at, m.created_at, m.deleted_at, m.edited_at,
           m.parent_message_id,
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
       ${cursor ? sql`AND m.created_at < ${cursor}::timestamptz` : sql``}
     ORDER BY m.created_at DESC
     LIMIT ${limit + 1}
  `)) as unknown as Array<{
    id: string
    conversation_id: string
    sender_id: string
    kind: MessageKind | string
    system_payload: unknown
    content: string
    is_flagged: boolean
    flag_reason: MessageRow['flagReason']
    is_read: boolean
    read_at: Date | string | null
    created_at: Date | string
    deleted_at: Date | string | null
    edited_at: Date | string | null
    parent_message_id: string | null
    parent_preview: unknown
    attachments: unknown
  }>

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  // Return in chronological order so UI can append directly.
  const mapped = page
    .slice()
    .reverse()
    .map((r) => mapMessageRowFromSql(r))
  return { messages: mapped, hasMore }
}

function mapMessageRowFromSql(r: {
  id: string
  conversation_id: string
  sender_id: string
  kind: MessageKind | string
  system_payload: unknown
  content: string
  is_flagged: boolean
  flag_reason: MessageRow['flagReason']
  is_read: boolean
  read_at: Date | string | null
  created_at: Date | string
  deleted_at: Date | string | null
  edited_at: Date | string | null
  parent_message_id: string | null
  parent_preview: unknown
  attachments: unknown
}): MessageRow {
  const attsRaw = Array.isArray(r.attachments)
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
  // Raw SQL via db.execute returns timestamptz columns as ISO strings
  // (postgres-js default), not Date objects. Normalize so downstream
  // consumers can `.toISOString()` safely.
  const toDate = (v: Date | string | null | undefined): Date | null => {
    if (!v) return null
    if (v instanceof Date) return v
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const parentPreview = parseParentPreview(r.parent_preview)
  const kind: MessageKind = r.kind === 'SYSTEM' ? 'SYSTEM' : 'USER'
  const systemPayload =
    kind === 'SYSTEM' && r.system_payload && typeof r.system_payload === 'object'
      ? (r.system_payload as Record<string, unknown>)
      : null
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderId: r.sender_id,
    kind,
    systemPayload,
    content: r.content,
    isFlagged: r.is_flagged,
    flagReason: r.flag_reason,
    isRead: r.is_read,
    readAt: toDate(r.read_at),
    createdAt: toDate(r.created_at) ?? new Date(),
    deletedAt: toDate(r.deleted_at),
    editedAt: toDate(r.edited_at),
    parentMessageId: r.parent_message_id,
    parentPreview,
    attachments: attsRaw.map((a) => ({
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
}

function parseParentPreview(raw: unknown): MessageParentPreview | null {
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

/**
 * Initial history (newest `limit` messages in chronological order).
 */
export async function listRecentMessages(
  conversationId: string,
  limit = 40,
): Promise<MessageRow[]> {
  const { messages: page } = await listMessagesPaged(conversationId, { limit })
  return page
}

/**
 * Number of conversations with at least one unread message for this user.
 * Computed from conversation_members.last_read_at vs conversations.last_message_at —
 * a single index-backed query, no message scan.
 *
 * "Unread" here means: the conversation's most recent message was sent by
 * someone else AND arrived after my last_read_at cursor.
 */
export async function countUnreadConversations(userId: string): Promise<number> {
  const [row] = await db
    .select({
      count: sql<number>`
        count(*)::int
      `.as('count'),
    })
    .from(conversationMembers)
    .innerJoin(
      conversations,
      eq(conversations.id, conversationMembers.conversationId),
    )
    .where(
      and(
        eq(conversationMembers.userId, userId),
        sql`${conversations.lastMessageSenderId} IS NOT NULL`,
        sql`${conversations.lastMessageSenderId} <> ${userId}::uuid`,
        sql`(${conversationMembers.lastReadAt} IS NULL
              OR ${conversations.lastMessageAt} > ${conversationMembers.lastReadAt})`,
      ),
    )
  return row?.count ?? 0
}

/**
 * Chronological messages for initial render, convenience variant returning
 * ordered ascending. Attachments embedded per message.
 */
export async function listMessagesAsc(
  conversationId: string,
  limit = 40,
): Promise<MessageRow[]> {
  const { messages: page } = await listMessagesPaged(conversationId, { limit })
  return page
}
