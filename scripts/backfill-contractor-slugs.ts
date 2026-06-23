/**
 * One-time backfill: mint a stable /roofers/[slug] slug for every existing
 * contractor that has a company name but no slug yet. Idempotent — re-running
 * skips anyone who already has one.
 *
 *   npx tsx scripts/backfill-contractor-slugs.ts
 *
 * Uses relative imports only (no "@/" alias) so it runs cleanly under tsx.
 */
import 'dotenv/config'
import { and, eq, isNull, isNotNull, like, or } from 'drizzle-orm'
import { db } from '../src/lib/db'
import { contractors } from '../src/lib/db/schema'
import { slugify } from '../src/lib/slug'

async function main() {
  const rows = await db
    .select({ id: contractors.id, companyName: contractors.companyName })
    .from(contractors)
    .where(and(isNull(contractors.slug), isNotNull(contractors.companyName)))

  let n = 0
  for (const r of rows) {
    if (!r.companyName) continue
    const base = slugify(r.companyName) || 'roofer'
    const conflicts = await db
      .select({ slug: contractors.slug })
      .from(contractors)
      .where(and(isNotNull(contractors.slug), or(eq(contractors.slug, base), like(contractors.slug, `${base}-%`))))
    const taken = new Set(conflicts.map((c) => c.slug))
    let candidate = base
    let k = 2
    while (taken.has(candidate)) candidate = `${base}-${k++}`
    await db.update(contractors).set({ slug: candidate }).where(eq(contractors.id, r.id))
    n++
  }
  console.log(`Backfilled slugs for ${n} contractors.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
