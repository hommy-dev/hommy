// `credits.expire` — daily cron (docs/HOMMY_PLATFORM.md §3.2 / §10). Plan-grant
// and launch-promo credits carry an `expires_at`; purchased/signup credits never
// expire. This job writes the negative `expiry` ledger entries for credits left
// unspent in lapsed lots (FIFO reconciliation in expireStaleCredits) and refreshes
// the cached balance, so the 4-month launch promo actually lapses.
//
// Candidate set is pruned to companies that (a) have a positive lot already past
// its expiry and (b) still hold a positive balance — if the balance is already
// 0/negative, every lot is fully consumed and there's nothing to expire. The
// per-company helper is idempotent, so re-scanning a settled company is a no-op.

import { and, eq, gt, isNotNull, lte } from 'drizzle-orm'
import { inngest } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractors, creditTransactions } from '@/lib/db/schema'
import { expireStaleCredits } from '@/lib/credits/ledger'
import { broadcastCreditsChanged } from '@/lib/credits/notify'

export const creditsExpire = inngest.createFunction(
  {
    id: 'credits-expire',
    name: 'Expire lapsed credit grants (FIFO)',
    triggers: [{ cron: '0 3 * * *' }],
  },
  async () => {
    const now = new Date()

    const candidates = await db
      .selectDistinct({ contractorId: creditTransactions.contractorId })
      .from(creditTransactions)
      .innerJoin(contractors, eq(contractors.id, creditTransactions.contractorId))
      .where(
        and(
          gt(creditTransactions.amount, 0),
          isNotNull(creditTransactions.expiresAt),
          lte(creditTransactions.expiresAt, now),
          gt(contractors.creditBalance, 0),
        ),
      )

    let companiesExpired = 0
    let totalExpired = 0
    for (const c of candidates) {
      try {
        const res = await db.transaction((tx) => expireStaleCredits(tx, c.contractorId, now))
        if (res.expired > 0) {
          companiesExpired += 1
          totalExpired += res.expired
          void broadcastCreditsChanged(c.contractorId, res.newBalance)
        }
      } catch (err) {
        console.error('[credits-expire] failed for contractor', { contractorId: c.contractorId, err })
      }
    }

    return { ok: true, scanned: candidates.length, companiesExpired, totalExpired }
  },
)
