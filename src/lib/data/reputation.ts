// Data layer for the contractor-facing reputation view (docs §4.3).
//
// Not cached: the score and its event log change as the contractor engages,
// wins, and collects reviews — it must read fresh. Runs on the privileged
// connection; authorization is enforced by scoping every query to the caller's
// contractorId (resolved from their active membership at the page).

import { db } from '@/lib/db'
import { and, desc, eq, gte, ne, sql } from 'drizzle-orm'
import {
  contractors,
  contractorServices,
  scoreEvents,
  serviceAreas,
} from '@/lib/db/schema'

export type ScoreEventKind = (typeof scoreEvents.kind.enumValues)[number]

export type ScoreEventRow = {
  id: string
  kind: ScoreEventKind
  delta: number
  note: string | null
  createdAt: Date
}

export type ReputationOverview = {
  /** How many points were gained/lost over the trailing 30 days. */
  trend30d: number
  /** Most recent score changes, newest first (capped). */
  events: ScoreEventRow[]
}

const RECENT_LIMIT = 30
const TREND_WINDOW_DAYS = 30

/** Recent score activity + the net 30-day trend for one company. */
export async function getReputationOverview(
  contractorId: string,
): Promise<ReputationOverview> {
  const since = new Date(Date.now() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const [events, [trendRow]] = await Promise.all([
    db
      .select({
        id: scoreEvents.id,
        kind: scoreEvents.kind,
        delta: scoreEvents.delta,
        note: scoreEvents.note,
        createdAt: scoreEvents.createdAt,
      })
      .from(scoreEvents)
      .where(eq(scoreEvents.contractorId, contractorId))
      .orderBy(desc(scoreEvents.createdAt))
      .limit(RECENT_LIMIT),
    db
      .select({ sum: sql<number>`coalesce(sum(${scoreEvents.delta}), 0)::int` })
      .from(scoreEvents)
      .where(
        and(
          eq(scoreEvents.contractorId, contractorId),
          gte(scoreEvents.createdAt, since),
        ),
      ),
  ])

  return { trend30d: trendRow?.sum ?? 0, events }
}

// ── Area comparison ───────────────────────────────────────────────────────────
// "How do I stack up against pros working my patch?" A peer is another VERIFIED
// company that (a) offers at least one of the same services and (b) has a service
// area that geographically overlaps one of ours (PostGIS ST_Intersects on the
// same `geom` used for lead matching). Names are intentionally NOT returned —
// only scores — so this stays a benchmark, not a way to snoop on rivals.

/** One anonymized rung on the area leaderboard (newest sort: score desc). */
export type AreaRung = {
  score: number
  rating: number | null
  reviews: number
  isSelf: boolean
}

export type AreaComparison = {
  /** Self's 1-based position among all companies in the area (incl. self). */
  rank: number
  /** Total companies in the comparison, including self. */
  total: number
  /** Companies other than self (0 ⇒ no overlapping peers to compare against). */
  peerCount: number
  /** Mean score across the area (incl. self), rounded. */
  averageScore: number
  selfScore: number
  /** Ranked rungs (capped), self always present and flagged. */
  rungs: AreaRung[]
}

const PEER_LIMIT = 50

/** Benchmark one company against verified peers serving the same area + service. */
export async function getAreaComparison(
  contractorId: string,
): Promise<AreaComparison | null> {
  const [self] = await db
    .select({
      profileScore: contractors.profileScore,
      avgRating: contractors.avgRating,
      totalReviews: contractors.totalReviews,
    })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1)
  if (!self) return null

  const peers = await db
    .select({
      profileScore: contractors.profileScore,
      avgRating: contractors.avgRating,
      totalReviews: contractors.totalReviews,
    })
    .from(contractors)
    .where(
      and(
        eq(contractors.verificationStatus, 'verified'),
        ne(contractors.id, contractorId),
        // shares at least one service with us
        sql`EXISTS (
          SELECT 1 FROM ${contractorServices} cs
          WHERE cs.contractor_id = ${contractors.id}
            AND cs.service_id IN (
              SELECT service_id FROM ${contractorServices} WHERE contractor_id = ${contractorId}
            )
        )`,
        // has a coverage area overlapping one of ours
        sql`EXISTS (
          SELECT 1 FROM ${serviceAreas} sa
          JOIN ${serviceAreas} mine
            ON mine.contractor_id = ${contractorId} AND mine.geom IS NOT NULL
          WHERE sa.contractor_id = ${contractors.id} AND sa.geom IS NOT NULL
            AND ST_Intersects(sa.geom, mine.geom)
        )`,
      ),
    )
    .orderBy(desc(contractors.profileScore), desc(contractors.totalReviews))
    .limit(PEER_LIMIT)

  const toRating = (v: string | null) => (v != null ? Number(v) : null)
  const all: AreaRung[] = [
    ...peers.map((p) => ({
      score: p.profileScore,
      rating: toRating(p.avgRating),
      reviews: p.totalReviews,
      isSelf: false,
    })),
    {
      score: self.profileScore,
      rating: toRating(self.avgRating),
      reviews: self.totalReviews,
      isSelf: true,
    },
  ]
  all.sort((a, b) => b.score - a.score || b.reviews - a.reviews)

  const total = all.length
  const rank = all.findIndex((r) => r.isSelf) + 1
  const averageScore = Math.round(all.reduce((s, r) => s + r.score, 0) / total)

  return {
    rank,
    total,
    peerCount: peers.length,
    averageScore,
    selfScore: self.profileScore,
    rungs: all,
  }
}
