// Data layer for the universal messaging graph (docs/HOMEI_PLATFORM.md §6).
//
// A conversation has participants that are either a USER (homeowner/admin) or a
// CONTRACTOR (the whole company — any active member reads/sends). The viewer is
// resolved to ONE participant identity per conversation; everything (unread,
// "is this mine", the other party's display) follows from that.
//
// NOT cached: messaging is live and must always be fresh. Authorization is the
// participant check — every read is scoped to conversations the caller is in.

import { cache } from 'react'
import { and, count, desc, eq, gt, inArray, isNull, lt, not, or, sql, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contractorMembers,
  contractors,
  conversationParticipants,
  conversations,
  messages,
  users,
  type MessageMeta,
} from '@/lib/db/schema'

export type ParticipantIdentity = { type: 'user' | 'contractor'; id: string }

export type ConversationSummary = {
  id: string
  contextType: string | null
  contextId: string | null
  otherName: string
  otherAvatarUrl: string | null
  otherKind: 'homeowner' | 'contractor'
  lastMessageBody: string | null
  lastMessageAt: Date | null
  hasUnread: boolean
}

export type ThreadMessage = {
  id: string
  senderType: 'user' | 'contractor' | 'system'
  senderId: string | null
  body: string
  /** Structured payload for rich messages (e.g. a quote card). Null for plain text. */
  meta: MessageMeta | null
  createdAt: string // ISO — bound for client components
  isMine: boolean
}

export type ConversationDetail = {
  id: string
  contextType: string | null
  contextId: string | null
  me: ParticipantIdentity
  otherName: string
  otherAvatarUrl: string | null
  otherKind: 'homeowner' | 'contractor'
}

/** Companies the user is an active member of (their contractor "seats"). */
export const getUserContractorIds = cache(async (userId: string): Promise<string[]> => {
  const rows = await db
    .select({ id: contractorMembers.contractorId })
    .from(contractorMembers)
    .where(and(eq(contractorMembers.userId, userId), eq(contractorMembers.status, 'active')))
  return rows.map((r) => r.id)
})

/** SQL predicate: a participant row that represents THIS viewer. */
function meCondition(userId: string, contractorIds: string[]): SQL | undefined {
  const asUser = and(
    eq(conversationParticipants.participantType, 'user'),
    eq(conversationParticipants.participantId, userId),
  )
  if (contractorIds.length === 0) return asUser
  return or(
    asUser,
    and(
      eq(conversationParticipants.participantType, 'contractor'),
      inArray(conversationParticipants.participantId, contractorIds),
    ),
  )
}

/** Resolve the viewer's single participant identity in a conversation (or null). */
export async function resolveParticipant(
  conversationId: string,
  userId: string,
  contractorIds: string[],
): Promise<(ParticipantIdentity & { lastReadAt: Date | null }) | null> {
  const [row] = await db
    .select({
      type: conversationParticipants.participantType,
      id: conversationParticipants.participantId,
      lastReadAt: conversationParticipants.lastReadAt,
    })
    .from(conversationParticipants)
    .where(and(eq(conversationParticipants.conversationId, conversationId), meCondition(userId, contractorIds)))
    .limit(1)
  return row ?? null
}

/**
 * Every conversation the user is a party to, newest activity first.
 *
 * React cache() dedupes per request: the messages layout (the rail) and the
 * contractor layout's unread badge both resolve the same user's inbox, so
 * without this it would build twice (~6 queries each).
 */
export const listConversationsForUser = cache(async (userId: string): Promise<ConversationSummary[]> => {
  const contractorIds = await getUserContractorIds(userId)

  const myParts = await db
    .select({
      conversationId: conversationParticipants.conversationId,
      type: conversationParticipants.participantType,
      id: conversationParticipants.participantId,
      lastReadAt: conversationParticipants.lastReadAt,
    })
    .from(conversationParticipants)
    .where(meCondition(userId, contractorIds))
  if (myParts.length === 0) return []

  const convoIds = myParts.map((p) => p.conversationId)
  const meByConvo = new Map(myParts.map((p) => [p.conversationId, p]))

  const [convos, allParts, latest] = await Promise.all([
    db
      .select({ id: conversations.id, contextType: conversations.contextType, contextId: conversations.contextId })
      .from(conversations)
      .where(inArray(conversations.id, convoIds)),
    db
      .select({
        conversationId: conversationParticipants.conversationId,
        type: conversationParticipants.participantType,
        id: conversationParticipants.participantId,
      })
      .from(conversationParticipants)
      .where(inArray(conversationParticipants.conversationId, convoIds)),
    db
      .selectDistinctOn([messages.conversationId], {
        conversationId: messages.conversationId,
        body: messages.body,
        senderType: messages.senderType,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, convoIds))
      .orderBy(messages.conversationId, desc(messages.createdAt)),
  ])
  const latestByConvo = new Map(latest.map((l) => [l.conversationId, l]))

  // The "other" party per conversation (first participant that isn't the viewer).
  const others = new Map<string, { type: 'user' | 'contractor'; id: string }>()
  for (const p of allParts) {
    const me = meByConvo.get(p.conversationId)
    if (!me) continue
    if (p.type === me.type && p.id === me.id) continue
    if (!others.has(p.conversationId)) others.set(p.conversationId, { type: p.type, id: p.id })
  }

  const otherUserIds = [...others.values()].filter((o) => o.type === 'user').map((o) => o.id)
  const otherContractorIds = [...others.values()].filter((o) => o.type === 'contractor').map((o) => o.id)
  const [userRows, contractorRows] = await Promise.all([
    otherUserIds.length
      ? db.select({ id: users.id, name: users.fullName }).from(users).where(inArray(users.id, otherUserIds))
      : Promise.resolve([] as { id: string; name: string | null }[]),
    otherContractorIds.length
      ? db
          .select({ id: contractors.id, name: contractors.companyName, logo: contractors.logoUrl })
          .from(contractors)
          .where(inArray(contractors.id, otherContractorIds))
      : Promise.resolve([] as { id: string; name: string | null; logo: string | null }[]),
  ])
  const userMap = new Map(userRows.map((u) => [u.id, u]))
  const contractorMap = new Map(contractorRows.map((c) => [c.id, c]))

  const summaries = convos.map<ConversationSummary>((c) => {
    const me = meByConvo.get(c.id)!
    const other = others.get(c.id)
    const lm = latestByConvo.get(c.id)
    const display =
      other?.type === 'contractor'
        ? {
            name: contractorMap.get(other.id)?.name ?? 'Contractor',
            avatar: contractorMap.get(other.id)?.logo ?? null,
            kind: 'contractor' as const,
          }
        : {
            name: (other ? userMap.get(other.id)?.name : null) ?? 'Homeowner',
            avatar: null,
            kind: 'homeowner' as const,
          }
    const hasUnread = Boolean(
      lm &&
        !(lm.senderType === me.type && lm.senderId === me.id) &&
        (me.lastReadAt === null || lm.createdAt > me.lastReadAt),
    )
    return {
      id: c.id,
      contextType: c.contextType,
      contextId: c.contextId,
      otherName: display.name,
      otherAvatarUrl: display.avatar,
      otherKind: display.kind,
      lastMessageBody: lm?.body ?? null,
      lastMessageAt: lm?.createdAt ?? null,
      hasUnread,
    }
  })

  return summaries.sort(
    (a, b) => (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0),
  )
})

/**
 * One conversation's header detail for the viewer (or null if not a party).
 *
 * React cache() dedupes per request: the thread page resolves the detail, then
 * getJobPanelForConversation resolves it again — without this the panel re-runs
 * this whole waterfall.
 */
export const getConversationForUser = cache(async (
  conversationId: string,
  userId: string,
): Promise<ConversationDetail | null> => {
  const contractorIds = await getUserContractorIds(userId)
  const me = await resolveParticipant(conversationId, userId, contractorIds)
  if (!me) return null

  // convo header and participant rows are independent — fetch in parallel.
  const [[convo], parts] = await Promise.all([
    db
      .select({ id: conversations.id, contextType: conversations.contextType, contextId: conversations.contextId })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1),
    db
      .select({ type: conversationParticipants.participantType, id: conversationParticipants.participantId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId)),
  ])
  if (!convo) return null

  const other = parts.find((p) => !(p.type === me.type && p.id === me.id))

  let otherName = 'Homeowner'
  let otherAvatarUrl: string | null = null
  let otherKind: 'homeowner' | 'contractor' = 'homeowner'
  if (other?.type === 'contractor') {
    const [c] = await db
      .select({ name: contractors.companyName, logo: contractors.logoUrl })
      .from(contractors)
      .where(eq(contractors.id, other.id))
      .limit(1)
    otherKind = 'contractor'
    otherName = c?.name ?? 'Contractor'
    otherAvatarUrl = c?.logo ?? null
  } else if (other?.type === 'user') {
    const [u] = await db.select({ name: users.fullName }).from(users).where(eq(users.id, other.id)).limit(1)
    otherName = u?.name ?? 'Homeowner'
  }

  return {
    id: convo.id,
    contextType: convo.contextType,
    contextId: convo.contextId,
    me: { type: me.type, id: me.id },
    otherName,
    otherAvatarUrl,
    otherKind,
  }
})

/** A page of messages (newest `limit`, or older than `before`), oldest-first. */
export async function listMessages(
  conversationId: string,
  me: ParticipantIdentity,
  options: { limit?: number; before?: string | null } = {},
): Promise<{ messages: ThreadMessage[]; hasMore: boolean }> {
  const limit = Math.min(Math.max(options.limit ?? 40, 1), 100)
  const before = options.before ? new Date(options.before) : null

  const rows = await db
    .select({
      id: messages.id,
      senderType: messages.senderType,
      senderId: messages.senderId,
      body: messages.body,
      meta: messages.meta,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        before ? lt(messages.createdAt, before) : undefined,
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const page = (hasMore ? rows.slice(0, limit) : rows).reverse()
  return {
    hasMore,
    messages: page.map((r) => ({
      id: r.id,
      senderType: r.senderType,
      senderId: r.senderId,
      body: r.body,
      meta: r.meta ?? null,
      createdAt: r.createdAt.toISOString(),
      isMine: r.senderType === me.type && r.senderId === me.id,
    })),
  }
}

/**
 * Number of conversations that are unread for this user — the sidebar badge.
 *
 * "Unread" matches listConversationsForUser exactly: the LATEST message in the
 * conversation is from the other party (not the viewer) and newer than the
 * viewer's lastReadAt. This is a single COUNT query (a DISTINCT ON latest-per-
 * conversation joined to the viewer's participant rows), so every contractor
 * page pays one round-trip instead of rebuilding the whole inbox.
 *
 * Edge: if the viewer is somehow both a `user` and a `contractor` participant in
 * one conversation, DISTINCT ON keeps a single latest row — the same
 * last-wins approximation as listConversationsForUser's meByConvo map.
 */
export const countUnreadConversations = cache(async (userId: string): Promise<number> => {
  const contractorIds = await getUserContractorIds(userId)

  // The viewer's participant identity per conversation (subquery).
  const me = db
    .select({
      conversationId: conversationParticipants.conversationId,
      type: conversationParticipants.participantType,
      id: conversationParticipants.participantId,
      lastReadAt: conversationParticipants.lastReadAt,
    })
    .from(conversationParticipants)
    .where(meCondition(userId, contractorIds))
    .as('me')

  // Latest message per conversation the viewer is in, carrying the me columns.
  const latest = db
    .selectDistinctOn([messages.conversationId], {
      conversationId: messages.conversationId,
      senderType: messages.senderType,
      senderId: messages.senderId,
      createdAt: messages.createdAt,
      meType: me.type,
      meId: me.id,
      lastReadAt: me.lastReadAt,
    })
    .from(messages)
    .innerJoin(me, eq(me.conversationId, messages.conversationId))
    .orderBy(messages.conversationId, desc(messages.createdAt))
    .as('latest')

  const [row] = await db
    .select({ value: count() })
    .from(latest)
    .where(
      and(
        // NOT (latest message is mine). sender_type and participant_type are
        // distinct Postgres enum types and can't be compared directly, so compare
        // them as text — exactly the string comparison listConversationsForUser
        // does in JS. (senderId/participantId share a type, so eq is fine.)
        not(
          and(
            sql`${latest.senderType}::text = ${latest.meType}::text`,
            eq(latest.senderId, latest.meId),
          )!,
        ),
        or(isNull(latest.lastReadAt), gt(latest.createdAt, latest.lastReadAt)),
      ),
    )
  return row?.value ?? 0
})

/**
 * User ids to notify about activity in a conversation: each user participant,
 * plus every active member of each contractor participant. Excludes the actor.
 */
export async function getConversationRecipientUserIds(
  conversationId: string,
  excludeUserId: string,
): Promise<string[]> {
  const parts = await db
    .select({ type: conversationParticipants.participantType, id: conversationParticipants.participantId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId))

  const userIds = new Set<string>()
  for (const p of parts) {
    if (p.type === 'user') userIds.add(p.id)
  }
  const companyIds = parts.filter((p) => p.type === 'contractor').map((p) => p.id)
  if (companyIds.length > 0) {
    const members = await db
      .select({ userId: contractorMembers.userId })
      .from(contractorMembers)
      .where(and(inArray(contractorMembers.contractorId, companyIds), eq(contractorMembers.status, 'active')))
    for (const m of members) userIds.add(m.userId)
  }
  userIds.delete(excludeUserId)
  return [...userIds]
}
