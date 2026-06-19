/**
 * Wipe ALL job / chat / quote / review / notification activity (dev tool).
 *
 *   pnpm test:reset
 *
 * Leaves accounts, companies, memberships, plans, services, and credit ledgers
 * intact — only the transactional/domain data is cleared, so you start from a
 * clean board. Pair with `pnpm test:seed` to repopulate scenarios.
 *
 * Requires DATABASE_URL. Safe to run repeatedly. DEV/STAGING ONLY.
 */

import 'dotenv/config'
import { db } from '../src/lib/db'
import {
  messages,
  conversationParticipants,
  conversations,
  reviews,
  estimates,
  projects,
  contacts,
  leadRecipients,
  leads,
  notifications,
  scoreEvents,
  contractors,
} from '../src/lib/db/schema'

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[test:reset] DATABASE_URL is not set.')
    process.exit(1)
  }

  console.log('[test:reset] wiping job / chat / quote / review / notification activity…')

  // Delete in FK-safe order (most cascade, but explicit = deterministic).
  await db.delete(messages)
  await db.delete(conversationParticipants)
  await db.delete(conversations)
  await db.delete(reviews)
  await db.delete(estimates)
  await db.delete(projects)
  await db.delete(contacts)
  await db.delete(leadRecipients)
  await db.delete(leads)
  await db.delete(notifications)
  await db.delete(scoreEvents)

  // Reviews are gone — reset the cached rating projection so the UI matches.
  await db.update(contractors).set({ avgRating: null, totalReviews: 0 })

  console.log('[test:reset] done — clean slate. Run `pnpm test:seed` to repopulate.')
  process.exit(0)
}

main().catch((err) => {
  console.error('[test:reset] failed', err)
  process.exit(1)
})
