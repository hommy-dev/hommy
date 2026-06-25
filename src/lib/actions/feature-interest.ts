'use server'

// Toggle a contractor's interest in a roadmap feature shown on
// /contractor/coming-next. One row per (user, feature_key) in feature_interest;
// voting again removes the row (toggle), so the button doubles as notify + vote.
// The aggregate count is the demand signal we prioritize the roadmap by.

import { and, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { db } from '@/lib/db'
import { featureInterest } from '@/lib/db/schema'
import { getRequiredUserId } from '@/lib/auth/session'
import { FEATURE_KEYS } from '@/components/dashboard/coming-next/features'

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function toggleFeatureInterest(
  featureKey: string,
): Promise<ActionResult<{ voted: boolean; count: number }>> {
  if (!FEATURE_KEYS.includes(featureKey)) {
    return { success: false, error: 'Unknown feature.' }
  }

  const userId = await getRequiredUserId()

  try {
    const existing = await db
      .select({ id: featureInterest.id })
      .from(featureInterest)
      .where(
        and(
          eq(featureInterest.userId, userId),
          eq(featureInterest.featureKey, featureKey),
        ),
      )
      .limit(1)

    const voted = existing.length === 0
    if (voted) {
      await db
        .insert(featureInterest)
        .values({ userId, featureKey })
        .onConflictDoNothing({
          target: [featureInterest.userId, featureInterest.featureKey],
        })
    } else {
      await db
        .delete(featureInterest)
        .where(
          and(
            eq(featureInterest.userId, userId),
            eq(featureInterest.featureKey, featureKey),
          ),
        )
    }

    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(featureInterest)
      .where(eq(featureInterest.featureKey, featureKey))

    revalidatePath('/contractor/coming-next')
    return { success: true, data: { voted, count } }
  } catch (err) {
    console.error('[toggleFeatureInterest] failed', err)
    return { success: false, error: 'Could not save that. Please try again.' }
  }
}
