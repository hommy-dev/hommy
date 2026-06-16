'use server'

// Engage — the contractor's first move on a lead (docs/HOMEI_PLATFORM.md §4.1
// step 3). In one atomic transaction we: row-lock the lead, reserve+charge
// credits, flip the recipient to `engaged`, and spin up the CRM workspace
// (contact + project + conversation with the homeowner). Async comms fire
// afterward via Inngest.
//
// NO hard engage cap: `engageSlots` only sizes the initial fan-out (how many
// companies we offer to at once). It does NOT limit who can engage — a company
// that reaches an open lead (a later offer, a cascade, or browsing leads) can
// always engage. A lead only stops accepting engagement once it is `awarded`.
//
// Affordability rule (D2, docs §4.2): we BLOCK engage unless the company can
// cover BOTH the small engagement fee AND the full award fee — the engagement
// fee is spent now, the award fee is only reserved so the homeowner's later
// accept can always charge the win.

import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import {
  contacts,
  conversationParticipants,
  conversations,
  homeowners,
  leadRecipients,
  leads,
  projects,
} from '@/lib/db/schema'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser } from '@/lib/data/dashboard'
import { canEngageLeads } from '@/lib/contractor/verification'
import {
  InsufficientCreditsError,
  lockBalance,
  spendCredits,
  type Tx,
} from '@/lib/credits/ledger'
import { recordScoreEvent } from '@/lib/reputation/score'
import { SCORE_DELTAS, LEAD_SLA } from '@/lib/config/tunables'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'

type EngageError =
  | 'UNAUTHENTICATED'
  | 'NO_COMPANY'
  | 'NOT_VERIFIED'
  | 'NOT_OFFERED'
  | 'LEAD_LOCKED'
  | 'ALREADY_ENGAGED'
  | 'INSUFFICIENT_CREDITS'
  | 'DB_ERROR'

export type EngageResult =
  | { ok: true; projectId: string; conversationId: string }
  | { ok: false; error: EngageError; message: string; needed?: number; balance?: number }

const MESSAGES: Record<EngageError, string> = {
  UNAUTHENTICATED: 'Please sign in.',
  NO_COMPANY: 'Set up your company before engaging leads.',
  NOT_VERIFIED: 'Verify your business to engage leads.',
  NOT_OFFERED: 'This lead is no longer available to you.',
  LEAD_LOCKED: 'This lead is no longer open — it has already been awarded.',
  ALREADY_ENGAGED: 'You have already engaged this lead.',
  INSUFFICIENT_CREDITS: 'Not enough credits. Top up to engage this lead.',
  DB_ERROR: 'Could not engage this lead. Please try again.',
}

function fail(error: EngageError, extra?: { needed?: number; balance?: number }): EngageResult {
  return { ok: false, error, message: MESSAGES[error], ...extra }
}

export async function engageLead(leadId: string): Promise<EngageResult> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return fail('NO_COMPANY')
  if (!canEngageLeads(contractor)) return fail('NOT_VERIFIED')
  if (!z.string().uuid().safeParse(leadId).success) return fail('NOT_OFFERED')

  type Outcome =
    | { code: 'OK'; projectId: string; conversationId: string; homeownerUserId: string }
    | { code: Exclude<EngageError, 'UNAUTHENTICATED' | 'NO_COMPANY' | 'NOT_VERIFIED' | 'DB_ERROR'>; needed?: number; balance?: number }

  let outcome: Outcome
  try {
    outcome = await db.transaction(async (tx): Promise<Outcome> => {
      // Lock the lead alone (no join — don't lock the homeowner/user rows).
      const [lead] = await tx
        .select({
          status: leads.status,
          serviceId: leads.serviceId,
          homeownerId: leads.homeownerId,
          engagementCreditCost: leads.engagementCreditCost,
          awardCreditCost: leads.awardCreditCost,
        })
        .from(leads)
        .where(eq(leads.id, leadId))
        .for('update')
        .limit(1)
      if (!lead) return { code: 'NOT_OFFERED' }
      if (lead.status !== 'open') return { code: 'LEAD_LOCKED' }

      // This company's offer row.
      const [recipient] = await tx
        .select({ status: leadRecipients.status })
        .from(leadRecipients)
        .where(and(eq(leadRecipients.leadId, leadId), eq(leadRecipients.contractorId, contractor.id)))
        .for('update')
        .limit(1)
      if (!recipient) return { code: 'NOT_OFFERED' }
      if (recipient.status === 'engaged' || recipient.status === 'won') return { code: 'ALREADY_ENGAGED' }
      if (recipient.status !== 'offered' && recipient.status !== 'viewed') return { code: 'NOT_OFFERED' }

      // Affordability (D2): must cover engagement fee + reserved award fee.
      const required = lead.engagementCreditCost + lead.awardCreditCost
      const balance = await lockBalance(tx, contractor.id)
      if (balance < required) return { code: 'INSUFFICIENT_CREDITS', needed: required, balance }

      // Charge the small engagement fee now (the award is only reserved).
      await spendCredits(tx, {
        contractorId: contractor.id,
        kind: 'lead_engagement',
        amount: lead.engagementCreditCost,
        sourceType: 'lead',
        sourceId: leadId,
        createdBy: user.id,
      })

      const now = new Date()
      await tx
        .update(leadRecipients)
        .set({ status: 'engaged', engagedAt: now, respondedAt: now })
        .where(and(eq(leadRecipients.leadId, leadId), eq(leadRecipients.contractorId, contractor.id)))

      const contactId = await upsertContact(tx, contractor.id, lead.homeownerId)

      const [project] = await tx
        .insert(projects)
        .values({
          contractorId: contractor.id,
          contactId,
          leadId,
          serviceId: lead.serviceId,
          stage: 'new_lead',
        })
        .returning({ id: projects.id })

      const [conversation] = await tx
        .insert(conversations)
        .values({ type: 'lead', contextType: 'project', contextId: project.id })
        .returning({ id: conversations.id })

      const [ho] = await tx
        .select({ userId: homeowners.userId })
        .from(homeowners)
        .where(eq(homeowners.id, lead.homeownerId))
        .limit(1)
      const homeownerUserId = ho?.userId ?? null

      await tx.insert(conversationParticipants).values(
        [
          homeownerUserId
            ? { conversationId: conversation.id, participantType: 'user' as const, participantId: homeownerUserId }
            : null,
          { conversationId: conversation.id, participantType: 'contractor' as const, participantId: contractor.id },
        ].filter((v): v is NonNullable<typeof v> => v !== null),
      )

      await recordScoreEvent(tx, {
        contractorId: contractor.id,
        kind: 'fast_engagement',
        delta: SCORE_DELTAS.fast_engagement,
        sourceType: 'lead',
        sourceId: leadId,
      })

      return {
        code: 'OK',
        projectId: project.id,
        conversationId: conversation.id,
        homeownerUserId: homeownerUserId ?? '',
      }
    })
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return fail('INSUFFICIENT_CREDITS', { needed: err.needed, balance: err.balance })
    }
    console.error('[engageLead] failed', err)
    return fail('DB_ERROR')
  }

  if (outcome.code !== 'OK') {
    return fail(outcome.code, { needed: outcome.needed, balance: outcome.balance })
  }

  // Async comms (notify the homeowner) — best-effort, never fail the engage.
  try {
    await inngest.send({
      name: INNGEST_EVENTS.LEAD_ENGAGED,
      data: {
        leadId,
        contractorId: contractor.id,
        projectId: outcome.projectId,
        conversationId: outcome.conversationId,
        homeownerUserId: outcome.homeownerUserId,
      },
    })
  } catch (err) {
    console.error('[engageLead] inngest send failed (non-fatal)', err)
  }

  revalidatePath('/contractor/jobs')
  revalidatePath('/contractor/messages')
  revalidatePath('/homeowner/requests')

  return { ok: true, projectId: outcome.projectId, conversationId: outcome.conversationId }
}

/**
 * Mark an offer as viewed (free) and tighten its SLA to the post-view window.
 * Best-effort and idempotent: only the first view (status `offered`) advances
 * the row; re-opening a viewed lead is a no-op.
 */
export async function markLeadViewed(leadId: string): Promise<void> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return
  if (!z.string().uuid().safeParse(leadId).success) return

  try {
    await db
      .update(leadRecipients)
      .set({
        status: 'viewed',
        viewedAt: new Date(),
        slaDeadline: sql`LEAST(${leadRecipients.slaDeadline}, now() + ${`${LEAD_SLA.POST_VIEW_HOURS} hours`}::interval)`,
      })
      .where(
        and(
          eq(leadRecipients.leadId, leadId),
          eq(leadRecipients.contractorId, contractor.id),
          eq(leadRecipients.status, 'offered'),
        ),
      )
  } catch (err) {
    console.error('[markLeadViewed] failed (non-fatal)', err)
  }
}

/** Get-or-create the company's contact record for this homeowner. */
async function upsertContact(tx: Tx, contractorId: string, homeownerId: string): Promise<string> {
  const [existing] = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.contractorId, contractorId), eq(contacts.homeownerId, homeownerId)))
    .limit(1)
  if (existing) return existing.id

  const [created] = await tx
    .insert(contacts)
    .values({ contractorId, homeownerId })
    .onConflictDoNothing()
    .returning({ id: contacts.id })
  if (created) return created.id

  // Lost an insert race — the row now exists, re-read it.
  const [row] = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.contractorId, contractorId), eq(contacts.homeownerId, homeownerId)))
    .limit(1)
  return row.id
}
