// Data layer for Hommy Support. The support THREAD lives on the messaging graph
// (conversations with contextType='support'); `support_tickets` is a per-user
// sidecar carrying admin triage state. These reads are admin-facing (privileged,
// RLS bypassed); authorization is the caller's getRequiredUser('admin'). Not
// cached — support state must be fresh. User-facing reads go through the normal
// messaging data layer (src/lib/data/conversations.ts).

import { and, desc, eq, inArray, ne, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { db } from "@/lib/db"
import { messages, supportTickets, users, type MessageMeta } from "@/lib/db/schema"
import { SUPPORT_USER_ID, type TicketPriority, type TicketStatus } from "@/lib/support/constants"

const LIST_LIMIT = 200
const NEEDS_REPLY: TicketStatus[] = ["open", "in_progress"]

export type AdminSupportRow = {
  ticketId: string
  conversationId: string
  ref: string
  requesterId: string
  requesterName: string | null
  requesterEmail: string
  requesterRole: string
  category: string | null
  status: TicketStatus
  priority: TicketPriority
  assignedAdminId: string | null
  assignedAdminName: string | null
  lastMessageAt: Date
  lastPreview: string | null
}

export type SupportThreadMessage = {
  id: string
  fromRequester: boolean
  isSystem: boolean
  body: string
  meta: MessageMeta | null
  createdAt: string
}

export type AdminSupportThread = Omit<AdminSupportRow, "lastPreview"> & {
  messages: SupportThreadMessage[]
}

export async function adminListSupportThreads(): Promise<AdminSupportRow[]> {
  const assignee = alias(users, "assignee")

  const rows = await db
    .select({
      ticketId: supportTickets.id,
      conversationId: supportTickets.conversationId,
      ref: supportTickets.ref,
      requesterId: supportTickets.requesterId,
      requesterName: users.fullName,
      requesterEmail: users.email,
      requesterRole: supportTickets.requesterRole,
      category: supportTickets.category,
      status: supportTickets.status,
      priority: supportTickets.priority,
      assignedAdminId: supportTickets.assignedAdminId,
      assignedAdminName: assignee.fullName,
      lastMessageAt: supportTickets.lastMessageAt,
    })
    .from(supportTickets)
    .leftJoin(users, eq(users.id, supportTickets.requesterId))
    .leftJoin(assignee, eq(assignee.id, supportTickets.assignedAdminId))
    .orderBy(desc(supportTickets.lastMessageAt))
    .limit(LIST_LIMIT)

  if (rows.length === 0) return []

  // Latest message preview per conversation (one DISTINCT ON query).
  const convoIds = rows.map((r) => r.conversationId)
  const latest = await db
    .selectDistinctOn([messages.conversationId], {
      conversationId: messages.conversationId,
      body: messages.body,
      meta: messages.meta,
    })
    .from(messages)
    .where(inArray(messages.conversationId, convoIds))
    .orderBy(messages.conversationId, desc(messages.createdAt))
  const previewByConvo = new Map(latest.map((l) => [l.conversationId, previewOf(l.body, l.meta)]))

  return rows.map((r) => ({
    ...r,
    requesterEmail: r.requesterEmail ?? "",
    status: r.status as TicketStatus,
    priority: r.priority as TicketPriority,
    lastPreview: previewByConvo.get(r.conversationId) ?? null,
  }))
}

export async function adminGetSupportThread(conversationId: string): Promise<AdminSupportThread | null> {
  const assignee = alias(users, "assignee")
  const [ticket] = await db
    .select({
      ticketId: supportTickets.id,
      conversationId: supportTickets.conversationId,
      ref: supportTickets.ref,
      requesterId: supportTickets.requesterId,
      requesterName: users.fullName,
      requesterEmail: users.email,
      requesterRole: supportTickets.requesterRole,
      category: supportTickets.category,
      status: supportTickets.status,
      priority: supportTickets.priority,
      assignedAdminId: supportTickets.assignedAdminId,
      assignedAdminName: assignee.fullName,
      lastMessageAt: supportTickets.lastMessageAt,
    })
    .from(supportTickets)
    .leftJoin(users, eq(users.id, supportTickets.requesterId))
    .leftJoin(assignee, eq(assignee.id, supportTickets.assignedAdminId))
    .where(eq(supportTickets.conversationId, conversationId))
    .limit(1)
  if (!ticket) return null

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
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)

  const messageList: SupportThreadMessage[] = rows.map((m) => ({
    id: m.id,
    isSystem: m.senderType === "system",
    fromRequester: m.senderType !== "system" && m.senderId === ticket.requesterId,
    body: m.body,
    meta: m.meta ?? null,
    createdAt: m.createdAt.toISOString(),
  }))

  return {
    ticketId: ticket.ticketId,
    conversationId: ticket.conversationId,
    ref: ticket.ref,
    requesterId: ticket.requesterId,
    requesterName: ticket.requesterName,
    requesterEmail: ticket.requesterEmail ?? "",
    requesterRole: ticket.requesterRole,
    category: ticket.category,
    status: ticket.status as TicketStatus,
    priority: ticket.priority as TicketPriority,
    assignedAdminId: ticket.assignedAdminId,
    assignedAdminName: ticket.assignedAdminName,
    lastMessageAt: ticket.lastMessageAt,
    messages: messageList,
  }
}

export async function countNeedsReplySupport(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supportTickets)
    .where(inArray(supportTickets.status, NEEDS_REPLY))
  return row?.count ?? 0
}

/** Real admin user ids (excludes the platform "Hommy Support" account). */
export async function getAdminUserIds(): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), ne(users.id, SUPPORT_USER_ID)))
  return rows.map((r) => r.id)
}

function previewOf(body: string, meta: MessageMeta | null): string {
  if (meta?.kind === "feature_request") return `💡 ${meta.subject}`
  if (meta?.kind === "attachment") return "📎 Attachment"
  return body
}
