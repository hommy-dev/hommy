// Unified notification helper — the only public API for sending notifications.
// Never call Resend, Twilio, or web-push directly — always use sendNotification().
// All channels fail silently and log errors — callers never need try/catch.
//
// This is the reusable transport core. Domain-specific helpers (new lead,
// follow-up due, storm alert, estimate accepted, review request — see
// docs/HOMMY_PLATFORM.md §9 & §12) are built on top of sendNotification()
// when the Hommy schema and Inngest jobs land.

import { db } from '@/lib/db'
import { notifications, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { sendEmail, type EmailAttachment } from './email'
import { renderEmail } from './email/template'
import { sendSms } from './sms'
import { sendPushToUser } from './push'
import { isSmsOptedOut } from './opt-out'
import { normalizeToE164 } from '@/lib/phone/e164'
import { broadcastUserEvent } from '@/lib/realtime/user-events'

// ============================================================
// TYPES
// ============================================================

export type NotificationType =
  | 'LEAD'
  | 'FOLLOW_UP'
  | 'STORM_ALERT'
  | 'ESTIMATE'
  | 'REVIEW'
  | 'MESSAGE'
  | 'SYSTEM'

export interface SendNotificationOptions {
  userId: string
  type: NotificationType
  title: string
  body: string
  actionUrl?: string
  entityType?: NotificationType
  entityId?: string
  emailHtml?: string   // full HTML email — if omitted, falls back to plain body text
  emailAttachments?: EmailAttachment[] // files to attach to the email (e.g. a quote PDF)
  smsBody?: string     // custom SMS copy — if omitted, falls back to title + body truncated
  sendSms?: boolean    // default false — high urgency only
  sendEmail?: boolean  // default true
  sendInApp?: boolean  // default true
  sendPush?: boolean   // default true
  /**
   * Optional idempotency key. When set, a partial unique index on
   * (user_id, dedup_key) blocks duplicate inserts — a second call with
   * the same key for the same user is a no-op (no toast, no push).
   * Use stable strings derived from the source event, e.g.
   *   "lead-assigned:{leadId}"
   *   "review-request:{projectId}"
   * Leave null/undefined for one-off notifications (the existing default).
   */
  dedupKey?: string
}

export interface NotificationResult {
  inApp?: { success: boolean; error?: string }
  email?: { success: boolean; error?: string }
  sms?: { success: boolean; error?: string }
  push?: { success: boolean }
}

// Only these types allow SMS — must also pass sendSms: true explicitly
const SMS_ALLOWED_TYPES: NotificationType[] = [
  'LEAD', 'FOLLOW_UP', 'STORM_ALERT', 'ESTIMATE',
]

// ============================================================
// MAIN FUNCTION
// ============================================================

export async function sendNotification(
  options: SendNotificationOptions
): Promise<NotificationResult> {
  const {
    userId,
    type,
    title,
    body,
    actionUrl,
    entityType,
    entityId,
    emailHtml,
    emailAttachments,
    smsBody,
    dedupKey,
    sendInApp = true,
    sendEmail: doEmail = true,
    sendSms: doSms = false,
    sendPush: doPush = true,
  } = options

  const result: NotificationResult = {}
  // Id of the notification row we create (if any) — used to scope the
  // sentEmail flag update below to this exact row.
  let createdNotificationId: string | null = null

  // Fetch user contact info (email + phone) in one query
  const [user] = await db
    .select({ email: users.email, phone: users.phone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    console.error(`[sendNotification] user not found: ${userId}`)
    return result
  }

  // 1. In-app: persist + broadcast on the user's inbox channel.
  //
  // We tried postgres_changes on the `notifications` table earlier — turns
  // out it's silently denied even with RLS + publication wired, because
  // the SSR browser client doesn't always push the JWT to the realtime
  // socket on schema-change events. The broadcast path is simpler and
  // matches how chat messages already work.
  if (sendInApp) {
    let createdId: string | null = null
    try {
      // When dedupKey is set, the partial unique index on
      // (user_id, dedup_key) blocks duplicates. onConflictDoNothing
      // turns a clash into a no-op (returns 0 rows) — we treat that
      // as "already delivered" and skip the broadcast + email + push
      // so the user doesn't get a second copy of the same logical event.
      const inserted = await db
        .insert(notifications)
        .values({
          userId,
          type,
          title,
          body,
          actionUrl,
          entityType,
          entityId,
          dedupKey,
          sentInApp: true,
          isRead: false,
        })
        .onConflictDoNothing()
        .returning({ id: notifications.id, createdAt: notifications.createdAt })

      const row = inserted[0]
      if (!row) {
        // Conflict — a notification with this dedup key already exists.
        // Silently no-op (no toast, no email, no push retry).
        result.inApp = { success: true }
        return result
      }

      createdId = row.id
      createdNotificationId = row.id
      result.inApp = { success: true }

      // Fire-and-forget: tell the open tab(s) immediately. The DB row is
      // already authoritative, so a dropped broadcast just delays the
      // toast until the next page navigation refetches.
      if (createdId) {
        void broadcastUserEvent(userId, 'notification:new', {
          id: createdId,
          type,
          title,
          body,
          actionUrl: actionUrl ?? null,
          entityType: entityType ?? null,
          entityId: entityId ?? null,
          createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
        })
      }
    } catch (err) {
      console.error('[sendNotification] in-app insert error', err)
      result.inApp = { success: false, error: String(err) }
    }
  }

  // 2. Email
  if (doEmail && user.email) {
    const html = emailHtml ?? fallbackEmailHtml(title, body, actionUrl)
    result.email = await sendEmail(user.email, title, html, emailAttachments)
    // Flag the exact row we created (best-effort, scoped by id).
    if (createdNotificationId) {
      db.update(notifications)
        .set({ sentEmail: true })
        .where(eq(notifications.id, createdNotificationId))
        .catch(() => {})
    }
  }

  // 3. SMS — only for high-urgency types when explicitly requested. Normalize
  // the stored number to E.164 (so legacy/raw rows still work) and skip anyone
  // who texted STOP (opt-out compliance).
  const e164 = normalizeToE164(user.phone)
  const smsAllowed = doSms && SMS_ALLOWED_TYPES.includes(type) && !!e164
  if (smsAllowed && !(await isSmsOptedOut(e164!))) {
    const text = smsBody ?? `Hommy: ${title}. ${body}`.slice(0, 160)
    result.sms = await sendSms(e164!, text)
  }

  // 4. Web Push
  if (doPush) {
    await sendPushToUser(userId, { title, body, actionUrl, entityId })
      .catch((err) => console.error('[sendNotification] push error', err))
    result.push = { success: true }
  }

  return result
}

// ============================================================
// FALLBACK EMAIL HTML — used when a caller doesn't supply custom HTML.
// Built on the shared layout so every email looks like one product.
// ============================================================

function fallbackEmailHtml(
  title: string,
  body: string,
  actionUrl?: string
): string {
  return renderEmail({
    preheader: body,
    heading: title,
    intro: body,
    cta: actionUrl ? { label: 'Open Hommy', url: actionUrl } : undefined,
  })
}
