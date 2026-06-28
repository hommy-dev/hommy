'use server'

// createLead — the homeowner post-a-job entry point and the heart of the
// platform. Validates intake, resolves the homeowner (logged-in or a guest we
// auto-create), creates the lead, and FANS IT OUT to eligible verified
// contractors in the same transaction so the offer is visible in their inbox
// instantly. An async `lead/created` event then handles notifications.
// See docs/HOMMY_PLATFORM.md §4 (lead lifecycle) and §5.2 (guest auto-signup).

import { z } from 'zod'
import { and, eq, gte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getOptionalUser } from '@/lib/auth/session'
import { createGuestHomeowner } from '@/lib/auth/guest-homeowner'
import { findEligibleContractors } from '@/lib/leads/matching'
import { getLeadPricing } from '@/lib/leads/pricing'
import { upsertContact } from '@/lib/leads/contact'
import { recordConsents } from '@/lib/consent/record'
import { normalizePostalCode } from '@/lib/geo/postal'
import { MAX_LEAD_PHOTOS, NOT_SURE_SUBTYPE } from '@/lib/leads/subtype'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { captureServerEvent } from '@/lib/analytics/posthog-server'
import { sendRealtimeBroadcast } from '@/lib/realtime/broadcast'
import { broadcastUserEvent } from '@/lib/realtime/user-events'
import { getConversationRecipientUserIds } from '@/lib/data/conversations'
import { getProjectConversationId, postSystemMessage } from '@/lib/messaging/system'
import {
  contractors,
  conversationParticipants,
  conversations,
  homeowners,
  leadRecipients,
  leads,
  messages,
  projects,
  services,
} from '@/lib/db/schema'

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
  // Optional SMS opt-in — only meaningful when a phone is provided. Logged as a
  // consent record; texting itself stays off until A2P 10DLC is live.
  smsOptIn: z.boolean().optional().default(false),
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
          error: 'You already have an account. Please sign in to post this job.',
          fieldErrors: { email: 'Already registered. Sign in instead' },
        }
      }
      if (guest.error === 'RATE_LIMITED') {
        return { success: false, error: 'Too many attempts from your network. Please wait a few minutes and try again.' }
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

  // Log consent (best-effort): by posting they agree to Terms/Privacy + that their
  // details are shared with matched pros; SMS only if they opted in with a phone.
  await recordConsents({
    userId: homeownerUserId,
    email: (user?.email ?? d.email) || null,
    source: 'post_a_job',
    consents: [
      { kind: 'terms', granted: true },
      { kind: 'data_sharing', granted: true },
      ...(d.smsOptIn && d.phone.trim() ? [{ kind: 'sms' as const, granted: true }] : []),
    ],
  })

  // Dedupe: a fresh open lead from the same homeowner for the same service +
  // address is almost always a double-submit (back button, impatience, a guest
  // re-running the wizard). Reuse it instead of fanning the same job out to up to
  // 25 contractors a second time. (Direct hire dedupes the same way.)
  const LEAD_DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000
  const [dupe] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        eq(leads.homeownerId, ho.id),
        eq(leads.serviceId, roofing.id),
        eq(leads.status, 'open'),
        eq(leads.address, d.address),
        gte(leads.createdAt, new Date(Date.now() - LEAD_DEDUPE_WINDOW_MS)),
      ),
    )
    .limit(1)
  if (dupe) {
    return { success: true, data: { leadId: dupe.id, matchedCount: 0, redirectTo: '/homeowner' } }
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
      } else {
        // No verified contractor covers this area. Keep the lead open + visible,
        // but flag it so the homeowner sees an honest "we're finding roofers"
        // state, the SLA cron won't auto-expire it, and the recruitment engine
        // can target this area. Cleared the moment a covering pro becomes eligible.
        await tx.update(leads).set({ awaitingCoverage: true }).where(eq(leads.id, lead.id))
      }
    })
  } catch (err) {
    console.error('[createLead] failed', err)
    return { success: false, error: 'Could not post your request. Please try again.' }
  }

  // Async comms — best-effort. The lead is already posted and visible, so a
  // failure here must never fail the post.
  try {
    if (matchedCount === 0) {
      // No coverage — recruit contractors for this area instead of fanning out.
      await inngest.send({ name: INNGEST_EVENTS.LEAD_AWAITING_COVERAGE, data: { leadId } })
    } else {
      await inngest.send({ name: INNGEST_EVENTS.LEAD_CREATED, data: { leadId } })
    }
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

// ─────────────────────────────────────────────────────────────────────────────
// Direct hire — requestDirectQuote
//
// A homeowner picks ONE contractor (from the public directory/profile) and sends
// them a targeted request. Unlike createLead this does NOT broadcast: it creates
// a single-target lead (`targetContractorId` set, engagement free) pre-engaged,
// spins up the same project + conversation `engageLead` does, and drops the
// homeowner straight into the 1:1 chat. Quote → accept → win fee then run exactly
// like the broadcast flow (all project-keyed). See docs/HOMMY_PLATFORM.md §4.

type DirectQuoteData = { conversationId: string; redirectTo: string }

const DirectQuoteSchema = CreateLeadSchema.extend({
  targetContractorSlug: z.string().trim().min(1, 'Choose a contractor'),
})

/** Post the homeowner's own words into the thread, broadcast live to both sides. */
async function postHomeownerMessage(
  conversationId: string,
  homeownerUserId: string,
  body: string,
): Promise<void> {
  const [row] = await db
    .insert(messages)
    .values({ conversationId, senderType: 'user', senderId: homeownerUserId, body, channel: 'platform' })
    .returning({ id: messages.id, createdAt: messages.createdAt })
  void sendRealtimeBroadcast({
    topic: `chat:${conversationId}`,
    event: 'message:new',
    payload: {
      id: row.id,
      senderType: 'user',
      senderId: homeownerUserId,
      body,
      meta: null,
      createdAt: row.createdAt.toISOString(),
      isMine: false,
    },
  }).catch((e) => console.error('[requestDirectQuote] broadcast threw', e))
  const userIds = await getConversationRecipientUserIds(conversationId, homeownerUserId)
  await Promise.all(userIds.map((uid) => broadcastUserEvent(uid, 'message:new', { conversationId })))
}

export async function requestDirectQuote(
  input: unknown,
): Promise<ActionResult<DirectQuoteData>> {
  const parsed = DirectQuoteSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { success: false, error: 'Please check the details and try again.', fieldErrors }
  }
  const d = parsed.data

  const [roofing] = await db
    .select({ id: services.id, subtypes: services.subtypes })
    .from(services)
    .where(eq(services.slug, 'roofing'))
    .limit(1)
  if (!roofing) {
    return { success: false, error: 'Service is temporarily unavailable. Please try again later.' }
  }
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
  const subtypes = d.subtypes.includes(NOT_SURE_SUBTYPE) ? [NOT_SURE_SUBTYPE] : d.subtypes

  const lat = d.lat ?? null
  const lng = d.lng ?? null
  if (lat == null || lng == null) {
    return {
      success: false,
      error: 'Please choose your address from the suggestions.',
      fieldErrors: { address: 'Pick an address from the dropdown' },
    }
  }

  // The chosen contractor must be a real, verified company (the directory only
  // exposes verified ones, but guard server-side regardless).
  const [target] = await db
    .select({ id: contractors.id, companyName: contractors.companyName })
    .from(contractors)
    .where(and(eq(contractors.slug, d.targetContractorSlug), eq(contractors.verificationStatus, 'verified')))
    .limit(1)
  if (!target) {
    return { success: false, error: "This roofer isn't available for direct requests right now." }
  }

  // Resolve the homeowner: reuse the logged-in one, or auto-create a guest (same
  // as createLead).
  const user = await getOptionalUser()
  let homeownerUserId: string

  if (user) {
    if (user.role !== 'homeowner') {
      return {
        success: false,
        error: 'You are signed in as a contractor. Sign in as a homeowner to request a quote.',
      }
    }
    homeownerUserId = user.id
  } else {
    const contactErrors: FieldErrors = {}
    if (d.fullName.length < 2) contactErrors.fullName = 'Enter your name'
    if (!EMAIL_RE.test(d.email)) contactErrors.email = 'Enter a valid email'
    if (Object.keys(contactErrors).length > 0) {
      return { success: false, error: 'Please add your contact details.', fieldErrors: contactErrors }
    }

    const guest = await createGuestHomeowner({ fullName: d.fullName, email: d.email, phone: d.phone })
    if (!guest.ok) {
      if (guest.error === 'EMAIL_IN_USE') {
        return {
          success: false,
          error: 'You already have an account. Please sign in to send this request.',
          fieldErrors: { email: 'Already registered. Sign in instead' },
        }
      }
      if (guest.error === 'RATE_LIMITED') {
        return { success: false, error: 'Too many attempts from your network. Please wait a few minutes and try again.' }
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

  // Log consent (best-effort): same as a broadcast post, but from the directory.
  await recordConsents({
    userId: homeownerUserId,
    email: (user?.email ?? d.email) || null,
    source: 'direct_request',
    consents: [
      { kind: 'terms', granted: true },
      { kind: 'data_sharing', granted: true },
      ...(d.smsOptIn && d.phone.trim() ? [{ kind: 'sms' as const, granted: true }] : []),
    ],
  })

  const companyName = target.companyName ?? 'this roofer'
  const where = [d.city, d.state].filter(Boolean).join(', ')
  const workLabel = subtypes.includes(NOT_SURE_SUBTYPE) ? 'a roofing project' : subtypes.join(', ')

  // Dedupe: if an open direct request already exists between this homeowner and
  // this contractor, drop the new message into that thread instead of starting a
  // second one.
  const [existing] = await db
    .select({ projectId: projects.id })
    .from(leads)
    .innerJoin(projects, and(eq(projects.leadId, leads.id), eq(projects.contractorId, target.id)))
    .where(
      and(
        eq(leads.homeownerId, ho.id),
        eq(leads.targetContractorId, target.id),
        eq(leads.status, 'open'),
      ),
    )
    .limit(1)
  if (existing) {
    const conversationId = await getProjectConversationId(existing.projectId)
    if (conversationId) {
      await postSystemMessage(conversationId, `Follow-up request: ${workLabel}${where ? ` in ${where}` : ''}.`)
      if (d.notes) await postHomeownerMessage(conversationId, homeownerUserId, d.notes)
      return {
        success: true,
        data: { conversationId, redirectTo: `/homeowner/messages/${conversationId}` },
      }
    }
  }

  const zipCode = d.zipCode ? normalizePostalCode(d.zipCode) : null
  const photos = d.photos.slice(0, MAX_LEAD_PHOTOS)

  let leadId = ''
  let conversationId = ''
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
          // Direct hire: free to engage, so no engagement snapshot. The win fee on
          // accept is computed from the accepted quote and charged then.
          engagementCreditCost: 0,
          targetContractorId: target.id,
        })
        .returning({ id: leads.id })
      leadId = lead.id

      const now = new Date()
      // Pre-engaged on the homeowner's behalf — no charge, no fan-out.
      await tx.insert(leadRecipients).values({
        leadId: lead.id,
        contractorId: target.id,
        status: 'engaged',
        engagedAt: now,
        respondedAt: now,
      })

      const contactId = await upsertContact(tx, target.id, ho.id)

      const [project] = await tx
        .insert(projects)
        .values({ contractorId: target.id, contactId, leadId: lead.id, serviceId: roofing.id, stage: 'new_lead' })
        .returning({ id: projects.id })

      const [conversation] = await tx
        .insert(conversations)
        .values({ type: 'lead', contextType: 'project', contextId: project.id })
        .returning({ id: conversations.id })
      conversationId = conversation.id

      await tx.insert(conversationParticipants).values([
        { conversationId: conversation.id, participantType: 'user', participantId: homeownerUserId },
        { conversationId: conversation.id, participantType: 'contractor', participantId: target.id },
      ])
    })
  } catch (err) {
    console.error('[requestDirectQuote] failed', err)
    return { success: false, error: 'Could not send your request. Please try again.' }
  }

  // First messages: a context line so the thread reads well, then the homeowner's
  // own words (if any). The full job (subtypes, address, photos) shows in the
  // contractor's job panel.
  try {
    await postSystemMessage(
      conversationId,
      `New direct request for ${companyName}: ${workLabel}${where ? ` in ${where}` : ''}.`,
    )
    if (d.notes) await postHomeownerMessage(conversationId, homeownerUserId, d.notes)
  } catch (err) {
    console.error('[requestDirectQuote] first-message failed (non-fatal)', err)
  }

  // Async comms — notify the chosen contractor's members. Best-effort.
  try {
    await inngest.send({
      name: INNGEST_EVENTS.DIRECT_REQUEST_CREATED,
      data: { leadId, contractorId: target.id, conversationId },
    })
  } catch (err) {
    console.error('[requestDirectQuote] inngest send failed (non-fatal)', err)
  }

  captureServerEvent(homeownerUserId, 'direct_request_sent', {
    leadId,
    targetContractorId: target.id,
    urgency: d.urgency,
    subtypes,
    isGuest: !user,
  })

  revalidatePath('/contractor/jobs')
  revalidatePath('/homeowner')

  return {
    success: true,
    data: { conversationId, redirectTo: `/homeowner/messages/${conversationId}` },
  }
}
