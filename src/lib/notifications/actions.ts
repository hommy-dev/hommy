'use server'

import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { getRequiredUser } from '@/lib/auth/session'
import type { InferSelectModel } from 'drizzle-orm'

export type NotificationRow = InferSelectModel<typeof notifications>

export async function getNotificationsAction(limit = 20): Promise<NotificationRow[]> {
  const user = await getRequiredUser()
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
}

export async function getUnreadCountAction(): Promise<number> {
  const user = await getRequiredUser()
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)))
  return row?.count ?? 0
}

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const user = await getRequiredUser()
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(eq(notifications.id, notificationId), eq(notifications.userId, user.id))
    )
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getRequiredUser()
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)))
}
