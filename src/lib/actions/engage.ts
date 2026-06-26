'use server'

// Engage — the contractor's first move on a lead (docs/HOMMY_PLATFORM.md §4.1
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
// Affordability rule (docs §4.2): engage gates ONLY on the small engagement fee.
// The win fee is a percentage of the accepted quote, computed later when the
// homeowner accepts (see accept-estimate.ts), so it can't be reserved here. That
// charge is allowed to push the balance negative; a negative balance then blocks
// taking NEW leads until the company settles up.

import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import {
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
import { upsertContact } from '@/lib/leads/contact'
import {
  InsufficientCreditsError,
  lockBalance,
  spendCredits,
} from '@/lib/credits/ledger'
import { recordScoreEvent } from '@/lib/reputation/score'
import { broadcastCreditsChanged } from '@/lib/credits/notify'
import { SCORE_DELTAS, FAST_ENGAGE_FRACTION, responseWindowHours, quoteReminderHours } from '@/lib/config/tunables'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { captureServerEvent } from '@/lib/analytics/posthog-server'

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
  | { ok: true; projectId: string; conversationId: string; creditsSpent: number; balanceAfter: number }
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
    | { code: 'OK'; projectId: string; conversationId: string; homeownerUserId: string; creditsSpent: number; balanceAfter: number }
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
          urgency: leads.urgency,
          engagementCreditCost: leads.engagementCreditCost,
        })
        .from(leads)
        .where(eq(leads.id, leadId))
        .for('update')
        .limit(1)
      if (!lead) return { code: 'NOT_OFFERED' }
      if (lead.status !== 'open') return { code: 'LEAD_LOCKED' }

      // This company's offer row.
      const [recipient] = await tx
        .select({ status: leadRecipients.status, offeredAt: leadRecipients.offeredAt })
        .from(leadRecipients)
        .where(and(eq(leadRecipients.leadId, leadId), eq(leadRecipients.contractorId, contractor.id)))
        .for('update')
        .limit(1)
      if (!recipient) return { code: 'NOT_OFFERED' }
      if (recipient.status === 'engaged' || recipient.status === 'won') return { code: 'ALREADY_ENGAGED' }
      if (recipient.status !== 'offered' && recipient.status !== 'viewed') return { code: 'NOT_OFFERED' }

      // Affordability: must cover the small engagement fee. The win fee is
      // computed + charged later (homeowner accept) and may go negative.
      const required = lead.engagementCreditCost
      const balance = await lockBalance(tx, contractor.id)
      if (balance < required) return { code: 'INSUFFICIENT_CREDITS', needed: required, balance }

      // Charge the small engagement fee now.
      const balanceAfter = await spendCredits(tx, {
        contractorId: contractor.id,
        kind: 'lead_engagement',
        amount: lead.engagementCreditCost,
        sourceType: 'lead',
        sourceId: leadId,
        createdBy: user.id,
      })

      const now = new Date()
      // slaDeadline here is the gentle QUOTE-REMINDER time (not a deadline): if
      // they haven't quoted by then, the cron sends one friendly nudge. No penalty.
      const remindAt = new Date(now.getTime() + quoteReminderHours(lead.urgency) * 60 * 60 * 1000)
      await tx
        .update(leadRecipients)
        .set({ status: 'engaged', engagedAt: now, respondedAt: now, slaDeadline: remindAt })
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

      // Reward speed: a true fast engage (within FAST_ENGAGE_FRACTION of the
      // urgency window) earns the bonus; a normal in-window engage earns less.
      const elapsedMs = now.getTime() - recipient.offeredAt.getTime()
      const fast = elapsedMs <= FAST_ENGAGE_FRACTION * responseWindowHours(lead.urgency) * 60 * 60 * 1000
      await recordScoreEvent(tx, {
        contractorId: contractor.id,
        kind: 'fast_engagement',
        delta: fast ? SCORE_DELTAS.fast_engagement : SCORE_DELTAS.engagement,
        sourceType: 'lead',
        sourceId: leadId,
      })

      return {
        code: 'OK',
        projectId: project.id,
        conversationId: conversation.id,
        homeownerUserId: homeownerUserId ?? '',
        creditsSpent: lead.engagementCreditCost,
        balanceAfter,
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

  // Funnel: contractor engaged a lead (small charge paid). Grouped by company so
  // the per-company funnel engage → quote → won lines up across team members.
  captureServerEvent(
    user.id,
    'lead_engaged',
    { leadId, creditsSpent: outcome.creditsSpent, balanceAfter: outcome.balanceAfter },
    { company: contractor.id },
  )

  // Refresh the header credit chip / sidebar balance live for the whole company.
  void broadcastCreditsChanged(contractor.id, outcome.balanceAfter)

  revalidatePath('/contractor/jobs')
  revalidatePath('/contractor/messages')
  revalidatePath('/homeowner')

  return {
    ok: true,
    projectId: outcome.projectId,
    conversationId: outcome.conversationId,
    creditsSpent: outcome.creditsSpent,
    balanceAfter: outcome.balanceAfter,
  }
}

/**
 * Mark an offer as viewed (free). Viewing is TELEMETRY only — it powers the
 * homeowner's "X pros viewed your job" signal and softens the ignore penalty,
 * but it does NOT change the deadline (one urgency-based clock; no perverse
 * "opening it hurts me"). Best-effort and idempotent: only the first view
 * (status `offered`) advances the row; re-opening a viewed lead is a no-op.
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
