// Stable public slug for a contractor's /roofers/[slug] page. Generated ONCE, the
// first time a company is named (onboarding or profile edit), and never changed
// afterwards — renaming the company keeps the original URL for SEO stability.

import { and, eq, isNotNull, like, ne, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors } from '@/lib/db/schema'
import { slugify } from '@/lib/slug'

// Accept the base client or an open transaction (so it runs inside the same tx
// that sets companyName).
type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Assign a unique slug derived from `companyName` if the contractor doesn't have
 * one yet. No-op when a slug already exists (keeps URLs stable across renames).
 */
export async function assignContractorSlugIfMissing(
  ex: DbExecutor,
  contractorId: string,
  companyName: string,
): Promise<void> {
  const [row] = await ex
    .select({ slug: contractors.slug })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1)
  if (!row || row.slug) return

  const base = slugify(companyName) || 'roofer'

  // Pull existing slugs that could collide and pick the first free variant.
  const conflicts = await ex
    .select({ slug: contractors.slug })
    .from(contractors)
    .where(
      and(
        isNotNull(contractors.slug),
        ne(contractors.id, contractorId),
        or(eq(contractors.slug, base), like(contractors.slug, `${base}-%`)),
      ),
    )
  const taken = new Set(conflicts.map((c) => c.slug))

  let candidate = base
  let n = 2
  while (taken.has(candidate)) candidate = `${base}-${n++}`

  await ex.update(contractors).set({ slug: candidate }).where(eq(contractors.id, contractorId))
}
