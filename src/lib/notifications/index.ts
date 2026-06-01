// Unified notification helper — the only public API for sending notifications.
// Never call Resend, Twilio, or web-push directly — always use sendNotification().
// All channels fail silently and log errors — callers never need try/catch.

import { db } from '@/lib/db'
import { notifications, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { sendEmail } from './email'
import { sendSms } from './sms'
import { sendPushToUser } from './push'
import { broadcastUserEvent } from '@/lib/realtime/user-events'

// ============================================================
// TYPES
// ============================================================

export type NotificationType =
  | 'LEAD'
  | 'QUOTE'
  | 'JOB'
  | 'PAYMENT'
  | 'REVIEW'
  | 'DISPUTE'
  | 'SYSTEM'
  | 'MESSAGE'

export interface SendNotificationOptions {
  userId: string
  type: NotificationType
  title: string
  body: string
  actionUrl?: string
  entityType?: 'LEAD' | 'QUOTE' | 'JOB' | 'PAYMENT' | 'REVIEW' | 'DISPUTE' | 'SYSTEM' | 'MESSAGE'
  entityId?: string
  emailHtml?: string   // full HTML email — if omitted, falls back to plain body text
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
   *   "quote-accepted:{quoteId}"
   *   "lead-new:{leadId}"
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
  'LEAD', 'QUOTE', 'JOB', 'PAYMENT', 'DISPUTE',
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
    smsBody,
    dedupKey,
    sendInApp = true,
    sendEmail: doEmail = true,
    sendSms: doSms = false,
    sendPush: doPush = true,
  } = options

  const result: NotificationResult = {}

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
  // matches how chat messages already work (see chat.ts:500).
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
    result.email = await sendEmail(user.email, title, html)
    // Update sentEmail flag on the notification row (best-effort)
    if (result.inApp?.success) {
      db.update(notifications)
        .set({ sentEmail: true })
        .where(eq(notifications.userId, userId))
        .catch(() => {})
    }
  }

  // 3. SMS — only for high-urgency types when explicitly requested
  const smsAllowed = doSms && SMS_ALLOWED_TYPES.includes(type) && !!user.phone
  if (smsAllowed) {
    const text = smsBody ?? `PaintPro: ${title}. ${body}`.slice(0, 160)
    result.sms = await sendSms(user.phone!, text)
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
// FALLBACK EMAIL HTML (plain body — used when no custom template)
// ============================================================

function fallbackEmailHtml(
  title: string,
  body: string,
  actionUrl?: string
): string {
  const cta = actionUrl
    ? `<a href="${actionUrl}" style="display:inline-block;margin-top:20px;background:#6c47ff;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Open →</a>`
    : ''
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f5;padding:40px 20px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
  <div style="background:#6c47ff;padding:20px 32px;"><span style="color:#fff;font-size:18px;font-weight:700;">PaintPro</span></div>
  <div style="padding:32px;">
    <h2 style="margin:0 0 12px;font-size:20px;color:#18181b;">${title}</h2>
    <p style="margin:0;color:#71717a;line-height:1.6;">${body}</p>
    ${cta}
  </div>
  <div style="background:#f9f9fb;border-top:1px solid #e4e4e7;padding:16px 32px;text-align:center;">
    <p style="margin:0;color:#a1a1aa;font-size:12px;">© ${new Date().getFullYear()} PaintPro</p>
  </div>
</div>
</body></html>`
}

// ============================================================
// SPECIALIZED HELPERS — onboarding & verification
// ============================================================

export async function notifyVerificationSubmitted(contractorUserId: string, contractorName: string) {
  const { verificationSubmitted } = await import('./templates')
  const { subject, html } = verificationSubmitted(contractorName)
  return sendNotification({
    userId: contractorUserId,
    type: 'SYSTEM',
    title: 'Application received',
    body: 'Our team is reviewing your application. You\'ll hear back within 1–2 business days.',
    actionUrl: '/contractor',
    entityType: 'SYSTEM',
    emailHtml: html,
    sendInApp: true,
    sendEmail: true,
    sendSms: false,
    sendPush: true,
  })
}

export async function notifyContractorApproved(
  contractorUserId: string,
  contractorName: string,
  adminNote?: string
) {
  const { accountApproved } = await import('./templates')
  const { subject, html } = accountApproved(contractorName, adminNote)
  return sendNotification({
    userId: contractorUserId,
    type: 'SYSTEM',
    title: "You're verified — welcome to PaintPro!",
    body: 'Your account is active. You\'ll start receiving leads within 24 hours.',
    actionUrl: '/contractor',
    entityType: 'SYSTEM',
    emailHtml: html,
    sendInApp: true,
    sendEmail: true,
    sendSms: false,
    sendPush: true,
  })
}

export async function notifyContractorRejected(
  contractorUserId: string,
  contractorName: string,
  reason: string
) {
  const { accountRejected } = await import('./templates')
  const { subject, html } = accountRejected(contractorName, reason)
  return sendNotification({
    userId: contractorUserId,
    type: 'SYSTEM',
    title: 'Application not approved',
    body: `Your application wasn't approved at this time. Reason: ${reason}`,
    actionUrl: '/contractor',
    entityType: 'SYSTEM',
    emailHtml: html,
    sendInApp: true,
    sendEmail: true,
    sendSms: false,
    sendPush: true,
  })
}

export async function notifyResubmissionRequested(
  contractorUserId: string,
  contractorName: string,
  note: string
) {
  const { resubmissionRequested } = await import('./templates')
  const { subject, html } = resubmissionRequested(contractorName, note)
  return sendNotification({
    userId: contractorUserId,
    type: 'SYSTEM',
    title: 'Action needed — resubmit your application',
    body: note,
    actionUrl: '/contractor',
    entityType: 'SYSTEM',
    emailHtml: html,
    sendInApp: true,
    sendEmail: true,
    sendSms: false,
    sendPush: true,
  })
}

// ============================================================
// SPECIALIZED HELPERS — leads
// ============================================================

export async function notifyContractorOfNewLead(
  contractorUserId: string,
  contractorName: string,
  city: string,
  jobType: string,
  leadId: string
) {
  const { newLead } = await import('./templates')
  const { html } = newLead(contractorName, city, jobType, leadId)
  return sendNotification({
    userId: contractorUserId,
    type: 'LEAD',
    title: `New lead in ${city}`,
    body: `A homeowner needs ${jobType} work. You have 24 hours to respond.`,
    actionUrl: `/contractor/leads/${leadId}`,
    entityType: 'LEAD',
    entityId: leadId,
    emailHtml: html,
    smsBody: `PaintPro: New lead in ${city} — ${jobType}. Respond in 24hrs: paintpro.com/contractor/leads/${leadId}`,
    sendSms: true,
    sendEmail: true,
    sendInApp: true,
    sendPush: true,
  })
}

export async function notifyLeadExpiring(
  contractorUserId: string,
  contractorName: string,
  city: string,
  leadId: string
) {
  const { leadExpiring } = await import('./templates')
  const { html } = leadExpiring(contractorName, city, leadId)
  return sendNotification({
    userId: contractorUserId,
    type: 'LEAD',
    title: 'Lead expiring in 2 hours',
    body: `Your lead in ${city} expires soon. Quote or decline now.`,
    actionUrl: `/contractor/leads/${leadId}`,
    entityType: 'LEAD',
    entityId: leadId,
    emailHtml: html,
    smsBody: `PaintPro: Lead expires in 2hrs. Act now: paintpro.com/contractor/leads/${leadId}`,
    sendSms: true,
    sendEmail: true,
    sendInApp: true,
    sendPush: true,
  })
}

// ============================================================
// SPECIALIZED HELPERS — quotes
// ============================================================

export async function notifyQuoteAccepted(
  contractorUserId: string,
  contractorName: string,
  amount: string,
  jobType: string,
  jobId: string
) {
  const { quoteAccepted } = await import('./templates')
  const { html } = quoteAccepted(contractorName, amount, jobType, jobId)
  return sendNotification({
    userId: contractorUserId,
    type: 'QUOTE',
    title: 'Quote accepted!',
    body: `Your $${amount} quote was accepted. Payment is secured.`,
    actionUrl: `/contractor/jobs/${jobId}`,
    entityType: 'JOB',
    entityId: jobId,
    emailHtml: html,
    smsBody: `PaintPro: Quote accepted — $${amount} secured. paintpro.com/contractor/jobs/${jobId}`,
    sendSms: true,
    sendEmail: true,
    sendInApp: true,
    sendPush: true,
  })
}

export async function notifyQuoteNotSelected(
  contractorUserId: string,
  contractorName: string,
  jobType: string
) {
  const { quoteNotSelected } = await import('./templates')
  const { html } = quoteNotSelected(contractorName, jobType)
  return sendNotification({
    userId: contractorUserId,
    type: 'QUOTE',
    title: 'Quote not selected',
    body: 'The homeowner chose a different contractor for this project.',
    actionUrl: '/contractor/leads',
    entityType: 'QUOTE',
    emailHtml: html,
    sendEmail: true,
    sendInApp: true,
    sendPush: false,
  })
}

export async function notifyHomeownerOfNewQuote(
  homeownerUserId: string,
  homeownerName: string,
  contractorBusiness: string,
  amount: string,
  projectId: string
) {
  const { newQuoteReceived } = await import('./templates')
  const { html } = newQuoteReceived(homeownerName, contractorBusiness, amount, projectId)
  return sendNotification({
    userId: homeownerUserId,
    type: 'QUOTE',
    title: `New quote from ${contractorBusiness}`,
    body: `$${amount} quote submitted for your project.`,
    actionUrl: `/homeowner/projects/${projectId}/quotes`,
    entityType: 'QUOTE',
    emailHtml: html,
    sendEmail: true,
    sendInApp: true,
    sendPush: true,
  })
}

// ============================================================
// SPECIALIZED HELPERS — jobs & payment
// ============================================================

export async function notifyHomeownerJobComplete(
  homeownerUserId: string,
  homeownerName: string,
  contractorBusiness: string,
  amount: string,
  jobId: string
) {
  const { jobMarkedComplete } = await import('./templates')
  const { html } = jobMarkedComplete(homeownerName, contractorBusiness, amount, jobId)
  return sendNotification({
    userId: homeownerUserId,
    type: 'JOB',
    title: 'Job marked complete — release payment',
    body: `${contractorBusiness} marked the job complete. Review and release $${amount}.`,
    actionUrl: `/homeowner/jobs/${jobId}`,
    entityType: 'JOB',
    entityId: jobId,
    emailHtml: html,
    smsBody: `PaintPro: ${contractorBusiness} marked your job complete. Release payment: paintpro.com/homeowner/jobs/${jobId}`,
    sendSms: true,
    sendEmail: true,
    sendInApp: true,
    sendPush: true,
  })
}

export async function notifyReleaseWarning(
  homeownerUserId: string,
  homeownerName: string,
  hoursLeft: 48 | 24 | 6,
  jobId: string
) {
  const { releaseWarning } = await import('./templates')
  const { html } = releaseWarning(homeownerName, hoursLeft, jobId)
  return sendNotification({
    userId: homeownerUserId,
    type: 'PAYMENT',
    title: `Payment releases in ${hoursLeft} hours`,
    body: hoursLeft <= 6
      ? 'This is your last chance to raise a concern before payment is released permanently.'
      : 'Review the work or raise a concern before payment releases automatically.',
    actionUrl: `/homeowner/jobs/${jobId}`,
    entityType: 'JOB',
    entityId: jobId,
    emailHtml: html,
    smsBody: `PaintPro: ${hoursLeft}hrs left to review. Release payment or raise concern: paintpro.com/homeowner/jobs/${jobId}`,
    sendSms: true,
    sendEmail: true,
    sendInApp: true,
    sendPush: true,
  })
}

export async function notifyContractorPaymentReleased(
  contractorUserId: string,
  contractorName: string,
  amount: string,
  jobId: string
) {
  const { paymentReleased } = await import('./templates')
  const { html } = paymentReleased(contractorName, amount, jobId)
  return sendNotification({
    userId: contractorUserId,
    type: 'PAYMENT',
    title: 'Payment released',
    body: `$${amount} is on its way to your bank. Arrives in ~2 business days.`,
    actionUrl: `/contractor/jobs/${jobId}`,
    entityType: 'JOB',
    entityId: jobId,
    emailHtml: html,
    smsBody: `PaintPro: $${amount} payment released. Arrives in ~2 business days.`,
    sendSms: true,
    sendEmail: true,
    sendInApp: true,
    sendPush: true,
  })
}

// ============================================================
// SPECIALIZED HELPERS — disputes
// ============================================================

export async function notifyDisputeRaised(
  homeownerUserId: string,
  homeownerName: string,
  contractorUserId: string,
  contractorName: string,
  reason: string,
  deadline: string,
  jobId: string
) {
  const { disputeRaisedHomeowner, disputeRaisedContractor } = await import('./templates')

  const homeownerHtml = disputeRaisedHomeowner(homeownerName, jobId).html
  const contractorHtml = disputeRaisedContractor(contractorName, reason, deadline, jobId).html

  await Promise.all([
    sendNotification({
      userId: homeownerUserId,
      type: 'DISPUTE',
      title: 'Dispute submitted',
      body: 'Your dispute has been received. Payment is frozen while we review.',
      actionUrl: `/homeowner/jobs/${jobId}/dispute`,
      entityType: 'DISPUTE',
      entityId: jobId,
      emailHtml: homeownerHtml,
      sendEmail: true,
      sendInApp: true,
      sendPush: true,
    }),
    sendNotification({
      userId: contractorUserId,
      type: 'DISPUTE',
      title: 'Dispute raised on your job',
      body: `The homeowner raised a dispute. Respond within 48 hours.`,
      actionUrl: `/contractor/jobs/${jobId}/dispute`,
      entityType: 'DISPUTE',
      entityId: jobId,
      emailHtml: contractorHtml,
      smsBody: `PaintPro: Dispute opened. Submit your response: paintpro.com/contractor/jobs/${jobId}/dispute`,
      sendSms: true,
      sendEmail: true,
      sendInApp: true,
      sendPush: true,
    }),
  ])
}

// ============================================================
// SPECIALIZED HELPERS — reviews
// ============================================================

export async function notifyReviewRequest(
  userId: string,
  name: string,
  otherParty: string,
  jobType: string,
  reviewUrl: string
) {
  const { reviewRequest } = await import('./templates')
  const { html } = reviewRequest(name, otherParty, jobType, reviewUrl)
  return sendNotification({
    userId,
    type: 'REVIEW',
    title: 'Leave a review',
    body: `How did your ${jobType} job with ${otherParty} go? You have 14 days.`,
    actionUrl: reviewUrl,
    entityType: 'REVIEW',
    emailHtml: html,
    sendEmail: true,
    sendInApp: true,
    sendPush: true,
  })
}
