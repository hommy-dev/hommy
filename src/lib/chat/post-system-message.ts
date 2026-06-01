/**
 * Insert a SYSTEM message into a conversation thread + broadcast it like
 * a normal message so every connected client renders it inline.
 *
 * Used by every server action that drives a state transition the user
 * needs to see in chat (quote.submitted, walkthrough.requested,
 * change_order.proposed, deposit.sent / received, fix_item.flagged,
 * job.complete, payment.released, …). The action must be the source of
 * truth for the underlying DB write — this helper only surfaces it in
 * chat. It is fire-and-forget from the caller's perspective; failure
 * is logged but never thrown.
 *
 * Sender identity: the senderId must be a real user (drizzle's FK
 * enforces this). Pick the user whose action triggered the message
 * (e.g. the contractor for `quote.submitted`, the homeowner for
 * `deposit.sent`). For system-driven Inngest emissions where there's
 * no human actor, pass the conversation's homeowner or contractor user
 * id — whichever makes more semantic sense.
 */

import { db } from '@/lib/db'
import { conversations, messages } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { sendRealtimeBroadcast } from '@/lib/realtime/broadcast'

/**
 * Discriminated union of every system-message kind v1-final emits.
 * Add a new arm here when introducing a new kind, then update the
 * SystemMessageBubble switch to render it.
 */
export type SystemMessagePayload =
  | { type: 'quote.submitted'; quoteId: string; total: number; currency: string }
  | { type: 'walkthrough.requested'; siteVisitId: string; proposedSlots: string[] }
  | { type: 'walkthrough.confirmed'; siteVisitId: string; scheduledAt: string }
  | { type: 'quote.accepted'; quoteId: string; agreedAmount: number; currency: string }
  | { type: 'deposit.sent'; jobId: string; amount: number; currency: string; method: string }
  | { type: 'deposit.received'; jobId: string }
  | { type: 'cooling_off.expired'; quoteId: string }
  | { type: 'job.started'; jobId: string }
  | { type: 'change_order.proposed'; changeOrderId: string; reason: string; amountDelta: number; currency: string }
  | { type: 'change_order.accepted'; changeOrderId: string }
  | { type: 'change_order.rejected'; changeOrderId: string }
  | { type: 'change_order.withdrawn'; changeOrderId: string }
  | { type: 'fix_item.flagged'; jobId: string; itemId: string; label: string; photoUrl: string | null }
  | { type: 'fix_item.fixed'; jobId: string; itemId: string; label: string }
  | { type: 'job.complete'; jobId: string }
  | { type: 'payment.released'; jobId: string; amount: number; currency: string }
  | { type: 'review.window_opens'; jobId: string }
  | { type: 'review.go_live'; jobId: string }
  | { type: 'lead.on_hold'; leadId: string; holdUntil: string; reason: string | null }
  | { type: 'lead.resumed'; leadId: string }
  | { type: 'lead.inactivity_warning'; leadId: string; expiresAt: string; nudgedSide: 'HOMEOWNER' | 'CONTRACTOR' }

/**
 * Find the conversation for a given (jobId | quoteId) and post a system
 * message into it. Returns the new message id, or null on failure.
 *
 * One of `jobId` or `quoteId` is required; jobId wins if both are
 * provided. The conversation must already exist (it always does
 * post-quote — `submitQuoteV2Action` creates one).
 */
export async function postSystemMessage(args: {
  /** One of jobId / quoteId — used to find the right conversation. */
  jobId?: string | null
  quoteId?: string | null
  /** Required when neither jobId nor quoteId is unique enough (rare). */
  conversationId?: string | null
  senderUserId: string
  /** Plain-text fallback rendered when the recipient client has no UI for this kind yet. */
  fallback: string
  payload: SystemMessagePayload
}): Promise<string | null> {
  let conversationId: string | null = args.conversationId ?? null

  if (!conversationId) {
    if (args.jobId) {
      const [row] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.jobId, args.jobId))
        .limit(1)
      conversationId = row?.id ?? null
    }
    if (!conversationId && args.quoteId) {
      const [row] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.quoteId, args.quoteId))
        .limit(1)
      conversationId = row?.id ?? null
    }
  }

  if (!conversationId) {
    console.warn('[postSystemMessage] no-conversation', {
      jobId: args.jobId,
      quoteId: args.quoteId,
      type: args.payload.type,
    })
    return null
  }

  try {
    const [row] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId: args.senderUserId,
        kind: 'SYSTEM',
        content: args.fallback,
        systemPayload: args.payload as unknown as Record<string, unknown>,
        isFlagged: false,
      })
      .returning({ id: messages.id, createdAt: messages.createdAt })

    // Bump the conversation's lastMessageAt + preview so it surfaces in
    // the inbox just like a user message. Using the same column the
    // chat sidebar reads from.
    await db
      .update(conversations)
      .set({
        lastMessageAt: row.createdAt,
        lastMessagePreview: args.fallback.slice(0, 160),
      })
      .where(eq(conversations.id, conversationId))

    void sendRealtimeBroadcast([
      {
        topic: `chat:${conversationId}`,
        event: 'message:new',
        payload: {
          id: row.id,
          conversationId,
          senderId: args.senderUserId,
          kind: 'SYSTEM',
          systemPayload: args.payload,
          content: args.fallback,
          isFlagged: false,
          flagReason: null,
          isRead: false,
          readAt: null,
          createdAt: row.createdAt.toISOString(),
          deletedAt: null,
          editedAt: null,
          parentMessageId: null,
          parentPreview: null,
          attachments: [],
        },
      },
    ]).catch((e) => console.error('[postSystemMessage] broadcast-failed', e))

    return row.id
  } catch (err) {
    console.error('[postSystemMessage] insert-failed', { type: args.payload.type, err })
    return null
  }
}
