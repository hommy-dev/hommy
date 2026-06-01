import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  notificationPreferences,
  type NotificationChannel,
} from '@/lib/db/schema'
import type { NotificationType } from '@/lib/notifications'

/**
 * Read whether a user has opted-in to receive a given (type, channel)
 * notification. The table stores opt-OUTs only — a missing row means
 * the channel is enabled. Future dispatcher code (sendNotification)
 * should consult this before delivering on each channel.
 */
export async function isChannelEnabled(
  userId: string,
  notificationType: NotificationType,
  channel: NotificationChannel,
): Promise<boolean> {
  const [row] = await db
    .select({ enabled: notificationPreferences.enabled })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.notificationType, notificationType),
        eq(notificationPreferences.channel, channel),
      ),
    )
    .limit(1)

  return row?.enabled ?? true
}
