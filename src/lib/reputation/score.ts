// Reputation — append a `score_events` row and update the cached
// `contractors.profile_score` in the same transaction (docs/HOMMY_PLATFORM.md
// §4.3). The ledger is the source of truth; the cached score gates matching
// priority and shows on the public profile. Score floors at 0.

import { eq, sql } from 'drizzle-orm'
import { contractors, scoreEvents } from '@/lib/db/schema'
import type { Tx } from '@/lib/credits/ledger'

type ScoreKind = (typeof scoreEvents.kind.enumValues)[number]

type ScoreArgs = {
  contractorId: string
  kind: ScoreKind
  /** Signed delta (positive lifts, negative decays). */
  delta: number
  sourceType?: string
  sourceId?: string
  note?: string
}

/** Record a reputation event and adjust the cached score (clamped at ≥ 0). */
export async function recordScoreEvent(tx: Tx, args: ScoreArgs): Promise<void> {
  const { contractorId, kind, delta, sourceType, sourceId, note } = args
  await tx.insert(scoreEvents).values({
    contractorId,
    kind,
    delta,
    sourceType: sourceType ?? null,
    sourceId: sourceId ?? null,
    note: note ?? null,
  })
  await tx
    .update(contractors)
    .set({ profileScore: sql`GREATEST(0, ${contractors.profileScore} + ${delta})` })
    .where(eq(contractors.id, contractorId))
}
