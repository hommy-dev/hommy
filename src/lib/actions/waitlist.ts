'use server'

// Pre-launch / early-access waitlist email capture (used by the AnnouncementBar
// on the public site). Records interest, stamping the region/country we detect
// from edge geo headers so we can see where demand is.
// See docs/HOMMY_PLATFORM.md §0 (multi-vertical) and src/lib/config/service-areas.ts.

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { services, waitlist } from '@/lib/db/schema'
import { GEO_COUNTRY_HEADER, GEO_REGION_HEADER } from '@/lib/config/service-areas'

type FieldErrors = Record<string, string>
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: FieldErrors }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const JoinWaitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => EMAIL_RE.test(v), 'Enter a valid email'),
  fullName: z.string().trim().max(120).optional().default(''),
  zipCode: z.string().trim().max(12).optional().default(''),
})

export async function joinWaitlist(
  input: unknown,
): Promise<ActionResult<{ ok: true }>> {
  const parsed = JoinWaitlistSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { success: false, error: 'Please check the details and try again.', fieldErrors }
  }
  const d = parsed.data

  // Stamp the region/country we detected at the edge (absent in local dev).
  const h = await headers()
  const region = h.get(GEO_REGION_HEADER)
  const country = h.get(GEO_COUNTRY_HEADER)

  // Tie to the live vertical for forward-compat (best-effort; never blocks).
  let serviceId: string | null = null
  try {
    const [roofing] = await db
      .select({ id: services.id })
      .from(services)
      .where(eq(services.slug, 'roofing'))
      .limit(1)
    serviceId = roofing?.id ?? null
  } catch {
    serviceId = null
  }

  try {
    await db
      .insert(waitlist)
      .values({
        email: d.email,
        fullName: d.fullName || null,
        zipCode: d.zipCode || null,
        region: region || null,
        country: country || null,
        serviceId,
        source: 'coming_soon',
      })
      // Idempotent: a repeat signup is still a success ("you're on the list").
      .onConflictDoNothing({ target: waitlist.email })
  } catch (err) {
    console.error('[joinWaitlist] failed', err)
    return { success: false, error: 'Could not add you to the list. Please try again.' }
  }

  return { success: true, data: { ok: true } }
}
