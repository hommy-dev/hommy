import { eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { featureInterest } from "@/lib/db/schema"
import { getRequiredUserId } from "@/lib/auth/session"

export type FeatureInterestSummary = {
  /** featureKey -> total votes across all users. Missing keys mean zero. */
  counts: Record<string, number>
  /** featureKeys the current user has already voted for. */
  mine: string[]
}

/**
 * Demand signal for the /contractor/coming-next roadmap: total upvotes per
 * feature plus which ones the current user has already opted into. Two small
 * indexed reads; safe to call per request (the page is dynamic per-user anyway).
 */
export async function getFeatureInterest(): Promise<FeatureInterestSummary> {
  const userId = await getRequiredUserId()

  const [totals, mineRows] = await Promise.all([
    db
      .select({
        featureKey: featureInterest.featureKey,
        count: sql<number>`count(*)::int`,
      })
      .from(featureInterest)
      .groupBy(featureInterest.featureKey),
    db
      .select({ featureKey: featureInterest.featureKey })
      .from(featureInterest)
      .where(eq(featureInterest.userId, userId)),
  ])

  const counts: Record<string, number> = {}
  for (const row of totals) counts[row.featureKey] = row.count

  return { counts, mine: mineRows.map((r) => r.featureKey) }
}
