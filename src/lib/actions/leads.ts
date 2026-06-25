'use server'

// createLead — the homeowner post-a-job entry point and the heart of the
// platform. Validates intake, resolves the homeowner (logged-in or a guest we
// auto-create), creates the lead, and FANS IT OUT to eligible verified
// contractors in the same transaction so the offer is visible in their inbox
// instantly. An async `lead/created` event then handles notifications.
// See docs/HOMMY_PLATFORM.md §4 (lead lifecycle) and §5.2 (guest auto-signup).

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getOptionalUser } from '@/lib/auth/session'
import { createGuestHomeowner } from '@/lib/auth/guest-homeowner'
import { findEligibleContractors } from '@/lib/leads/matching'
import { getLeadPricing } from '@/lib/leads/pricing'
import { normalizePostalCode } from '@/lib/geo/postal'
import { MAX_LEAD_PHOTOS, NOT_SURE_SUBTYPE } from '@/lib/leads/subtype'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { captureServerEvent } from '@/lib/analytics/posthog-server'
import { homeowners, leadRecipients, leads, services } from '@/lib/db/schema'

type FieldErrors = Record<string, string>
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: FieldErrors }

type CreateLeadData = {
  leadId: string
  matchedCount: number
  redirectTo: string
}

const CreateLeadSchema = z.object({
  subtypes: z.array(z.string().trim().min(1)).min(1, 'Choose the type of work'),
  urgency: z.enum(['emergency', 'within_week', 'within_month', 'planning']),
  address: z.string().trim().min(3, 'Enter the property address'),
  // City/state/postal are display-only and optional (Google doesn't always
  // return a postal code, and many countries have no state). Matching is
  // GEOGRAPHIC — it uses lat/lng, which the address lookup always provides.
  city: z.string().trim().optional().default(''),
  state: z.string().trim().optional().default(''),
  zipCode: z.string().trim().max(12).optional().default(''),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  notes: z.string().trim().max(1000).optional().default(''),
  // Optional job photos — Cloudinary secure URLs uploaded client-side before
  // submit. Capped so a stray client can't store an unbounded list.
  photos: z
    .array(z.string().trim().url())
    .max(MAX_LEAD_PHOTOS)
    .optional()
    .default([]),
  // Guest contact — required only when no homeowner is logged in.
  fullName: z.string().trim().optional().default(''),
  email: z.string().trim().toLowerCase().optional().default(''),
  phone: z.string().trim().optional().default(''),
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function createLead(
  input: unknown,
): Promise<ActionResult<CreateLeadData>> {
  const parsed = CreateLeadSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { success: false, error: 'Please check the details and try again.', fieldErrors }
  }
  const d = parsed.data

  // Roofing is the only live vertical; every lead references its service_id and
  // the subtype must be one the service actually offers.
  const [roofing] = await db
    .select({ id: services.id, subtypes: services.subtypes })
    .from(services)
    .where(eq(services.slug, 'roofing'))
    .limit(1)
  if (!roofing) {
    return { success: false, error: 'Service is temporarily unavailable. Please try again later.' }
  }
  // Each pick must be a real service subtype, or the "Not sure" sentinel.
  const invalidSubtypes = d.subtypes.filter(
    (s) => s !== NOT_SURE_SUBTYPE && !roofing.subtypes.includes(s),
  )
  if (invalidSubtypes.length > 0) {
    return {
      success: false,
      error: 'Please pick valid types of work.',
      fieldErrors: { subtypes: 'Pick from the listed options' },
    }
  }
  // "Not sure" is mutually exclusive with specific picks — collapse defensively
  // in case a client sent both.
  const subtypes = d.subtypes.includes(NOT_SURE_SUBTYPE)
    ? [NOT_SURE_SUBTYPE]
    : d.subtypes

  // Geographic matching needs coordinates; the address picker always supplies
  // them when an address is selected from the suggestions.
  const lat = d.lat ?? null
  const lng = d.lng ?? null
  if (lat == null || lng == null) {
    return {
      success: false,
      error: 'Please choose your address from the suggestions.',
      fieldErrors: { address: 'Pick an address from the dropdown so we can find nearby roofers' },
    }
  }

  // Resolve the homeowner: reuse the logged-in one, or auto-create a guest.
  const user = await getOptionalUser()
  let homeownerUserId: string

  if (user) {
    if (user.role !== 'homeowner') {
      return {
        success: false,
        error: 'You are signed in as a contractor. Sign in as a homeowner to post a job.',
      }
    }
    homeownerUserId = user.id
  } else {
    const contactErrors: FieldErrors = {}
    if (d.fullName.length < 2) contactErrors.fullName = 'Enter your name'
    if (!EMAIL_RE.test(d.email)) contactErrors.email = 'Enter a valid email'
    if (d.phone.replace(/\D/g, '').length < 7) contactErrors.phone = 'Enter your phone number'
    if (Object.keys(contactErrors).length > 0) {
      return { success: false, error: 'Please add your contact details.', fieldErrors: contactErrors }
    }

    const guest = await createGuestHomeowner({
      fullName: d.fullName,
      email: d.email,
      phone: d.phone,
    })
    if (!guest.ok) {
      if (guest.error === 'EMAIL_IN_USE') {
        return {
          success: false,
          error: 'You already have an account — please sign in to post this job.',
          fieldErrors: { email: 'Already registered — sign in instead' },
        }
      }
      return { success: false, error: 'We could not set up your account. Please try again.' }
    }
    homeownerUserId = guest.userId
  }

  const [ho] = await db
    .select({ id: homeowners.id })
    .from(homeowners)
    .where(eq(homeowners.userId, homeownerUserId))
    .limit(1)
  if (!ho) {
    return { success: false, error: 'Your homeowner profile is missing. Please contact support.' }
  }

  const pricing = getLeadPricing('roofing')
  // Postal code is optional/display-only now (matching is geographic).
  const zipCode = d.zipCode ? normalizePostalCode(d.zipCode) : null
  // Photos live in service_details (flexible, multi-vertical), and the first
  // mirrors onto photo_url for legacy single-photo surfaces (lead-card thumb).
  const photos = d.photos.slice(0, MAX_LEAD_PHOTOS)

  let leadId = ''
  let matchedCount = 0
  try {
    await db.transaction(async (tx) => {
      const [lead] = await tx
        .insert(leads)
        .values({
          homeownerId: ho.id,
          serviceId: roofing.id,
          serviceDetails: { subtypes, ...(photos.length ? { photos } : {}) },
          urgency: d.urgency,
          address: d.address,
          city: d.city || null,
          state: d.state || null,
          zipCode,
          lat,
          lng,
          photoUrl: photos[0] ?? null,
          notes: d.notes || null,
          status: 'open',
          engagementCreditCost: pricing.engagementCreditCost,
          // award_credit_cost is deprecated (win fee is computed at acceptance);
          // leave it at its 0 default.
        })
        .returning({ id: leads.id })
      leadId = lead.id

      // Free fan-out — offer the lead to eligible verified contractors.
      const eligible = await findEligibleContractors(
        { serviceId: roofing.id, lat, lng },
        tx,
      )
      matchedCount = eligible.length
      if (eligible.length > 0) {
        await tx.insert(leadRecipients).values(
          eligible.map((e) => ({
            leadId: lead.id,
            contractorId: e.contractorId,
            status: 'offered' as const,
          })),
        )
      }
    })
  } catch (err) {
    console.error('[createLead] failed', err)
    return { success: false, error: 'Could not post your request. Please try again.' }
  }

  // Async comms — best-effort. The lead is already posted and visible, so a
  // failure here must never fail the post.
  try {
    await inngest.send({ name: INNGEST_EVENTS.LEAD_CREATED, data: { leadId } })
  } catch (err) {
    console.error('[createLead] inngest send failed (non-fatal)', err)
  }

  // Funnel: homeowner posted a job (top of the lead lifecycle). Attributed to
  // the homeowner user — works for both logged-in and guest-auto-created posters.
  captureServerEvent(homeownerUserId, 'lead_posted', {
    leadId,
    matchedCount,
    urgency: d.urgency,
    subtypes,
    isGuest: !user,
  })

  revalidatePath('/contractor/jobs')
  revalidatePath('/homeowner')

  return {
    success: true,
    data: { leadId, matchedCount, redirectTo: '/homeowner' },
  }
}
