import webpush from 'web-push'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export interface PushPayload {
  title: string
  body: string
  actionUrl?: string
  entityId?: string
}

function initWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:notifications@paintpro.com'
  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    return true
  }
  return false
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  if (!initWebPush()) {
    console.log(`[Push stub] userId: ${userId} | title: ${payload.title}`)
    return
  }

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))

  if (subs.length === 0) return

  const body = JSON.stringify(payload)

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        )
      } catch (err) {
        // web-push throws an Error with `statusCode` for HTTP-level failures.
        // 410 Gone / 404 Not Found mean the subscription is no longer valid
        // and should be cleaned up so we don't keep retrying.
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 410 || status === 404) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id))
            .catch(() => {})
        } else {
          console.error('[sendPush] error', err)
        }
      }
    })
  )
}
