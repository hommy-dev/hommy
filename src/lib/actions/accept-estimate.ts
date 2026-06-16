'use server'

// Accept = Win (docs §4.1 step 5 / §4.2). The HOMEOWNER accepts a sent quote —
// the unambiguous "job won" signal. In one transaction we charge the winner the
// full award credit (`lead_won`), award the lead, mark the other engaged
// contractors lost, and move the winning project into `in_progress`. The charge
// allows a negative balance (D2 safety net) so the homeowner's action always
// succeeds. Two entry points — the authenticated dashboard and the tokenized
// email link — converge on one core.

import { headers } from 'next/headers'
import { and, eq, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { estimates, leadRecipients, leads, projects } from '@/lib/db/schema'
import { getRequiredUser } from '@/lib/auth/session'
import { getHomeownerForUser } from '@/lib/data/homeowner'
import { spendCredits } from '@/lib/credits/ledger'
import { recordScoreEvent } from '@/lib/reputation/score'
import { SCORE_DELTAS } from '@/lib/config/tunables'
import { getProjectConversationId, markQuoteMessageAccepted, postSystemMessage } from '@/lib/messaging/system'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'

type AcceptError =
  | 'NOT_FOUND'
  | 'NOT_AUTHORIZED'
  | 'NOT_SENT'
  | 'ALREADY_AWARDED'
  | 'DB_ERROR'

export type AcceptResult = { ok: true; projectId: string } | { ok: false; error: AcceptError; message: string }

const MESSAGES: Record<AcceptError, string> = {
  NOT_FOUND: 'That quote no longer exists.',
  NOT_AUTHORIZED: 'This quote isn’t on one of your requests.',
  NOT_SENT: 'This quote can’t be accepted anymore.',
  ALREADY_AWARDED: 'You’ve already hired a contractor for this request.',
  DB_ERROR: 'Could not accept the quote. Please try again.',
}

const fail = (error: AcceptError): AcceptResult => ({ ok: false, error, message: MESSAGES[error] })

/** Authenticated homeowner accepts a quote from their dashboard. */
export async function acceptEstimate(estimateId: string): Promise<AcceptResult> {
  const user = await getRequiredUser('homeowner')
  const homeowner = await getHomeownerForUser(user.id)
  if (!homeowner) return fail('NOT_AUTHORIZED')
  return performAccept(estimateId, homeowner.id)
}

/** Tokenized acceptance from an email link (token possession authorizes). */
export async function acceptEstimateByToken(token: string): Promise<AcceptResult> {
  if (!token || token.length < 16) return fail('NOT_FOUND')
  const [row] = await db
    .select({ id: estimates.id })
    .from(estimates)
    .where(eq(estimates.acceptToken, token))
    .limit(1)
  if (!row) return fail('NOT_FOUND')
  return performAccept(row.id, null)
}

type Outcome =
  | {
      code: 'OK'
      winnerContractorId: string
      winnerProjectId: string
      leadId: string
      loserProjectIds: string[]
    }
  | { code: Exclude<AcceptError, 'DB_ERROR'> }

/**
 * Core accept transaction. `expectedHomeownerId` enforces ownership for the
 * dashboard path; pass null for the token path (already authorized by token).
 */
async function performAccept(estimateId: string, expectedHomeownerId: string | null): Promise<AcceptResult> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const ua = h.get('user-agent') ?? null

  let outcome: Outcome
  try {
    outcome = await db.transaction(async (tx): Promise<Outcome> => {
      const [estimate] = await tx
        .select({
          id: estimates.id,
          status: estimates.status,
          projectId: estimates.projectId,
          lineItems: estimates.lineItems,
          subtotal: estimates.subtotal,
          taxAmount: estimates.taxAmount,
          total: estimates.total,
        })
        .from(estimates)
        .where(eq(estimates.id, estimateId))
        .for('update')
        .limit(1)
      if (!estimate) return { code: 'NOT_FOUND' }
      if (estimate.status !== 'sent') return { code: 'NOT_SENT' }

      const [project] = await tx
        .select({ id: projects.id, contractorId: projects.contractorId, leadId: projects.leadId })
        .from(projects)
        .where(eq(projects.id, estimate.projectId))
        .limit(1)
      if (!project?.leadId) return { code: 'NOT_FOUND' }

      const [lead] = await tx
        .select({ status: leads.status, awardCreditCost: leads.awardCreditCost, homeownerId: leads.homeownerId })
        .from(leads)
        .where(eq(leads.id, project.leadId))
        .for('update')
        .limit(1)
      if (!lead) return { code: 'NOT_FOUND' }
      if (expectedHomeownerId && lead.homeownerId !== expectedHomeownerId) return { code: 'NOT_AUTHORIZED' }
      if (lead.status === 'awarded' || lead.status === 'closed') return { code: 'ALREADY_AWARDED' }

      const winnerContractorId = project.contractorId
      const leadId = project.leadId

      // Full award charge — fires on the homeowner's action, may go negative.
      await spendCredits(tx, {
        contractorId: winnerContractorId,
        kind: 'lead_won',
        amount: lead.awardCreditCost,
        allowNegative: true,
        sourceType: 'lead',
        sourceId: leadId,
      })

      const now = new Date()
      await tx
        .update(estimates)
        .set({
          status: 'accepted',
          acceptedAt: now,
          acceptedIp: ip,
          acceptedUserAgent: ua,
          acceptedSnapshot: {
            lineItems: estimate.lineItems,
            subtotal: estimate.subtotal,
            taxAmount: estimate.taxAmount,
            total: estimate.total,
          },
        })
        .where(eq(estimates.id, estimate.id))

      await tx
        .update(leads)
        .set({ status: 'awarded', awardedTo: winnerContractorId, awardedAt: now })
        .where(eq(leads.id, leadId))

      await tx
        .update(leadRecipients)
        .set({ status: 'won', respondedAt: now })
        .where(and(eq(leadRecipients.leadId, leadId), eq(leadRecipients.contractorId, winnerContractorId)))

      // Other engaged contractors lose.
      await tx
        .update(leadRecipients)
        .set({ status: 'lost' })
        .where(
          and(
            eq(leadRecipients.leadId, leadId),
            eq(leadRecipients.status, 'engaged'),
            ne(leadRecipients.contractorId, winnerContractorId),
          ),
        )

      const loserProjects = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.leadId, leadId), ne(projects.id, project.id)))
      const loserProjectIds = loserProjects.map((p) => p.id)

      await tx
        .update(projects)
        .set({ stage: 'lost', stageUpdatedAt: now })
        .where(and(eq(projects.leadId, leadId), ne(projects.id, project.id)))

      await tx
        .update(projects)
        .set({ stage: 'in_progress', stageUpdatedAt: now })
        .where(eq(projects.id, project.id))

      await recordScoreEvent(tx, {
        contractorId: winnerContractorId,
        kind: 'quote_accepted',
        delta: SCORE_DELTAS.quote_accepted,
        sourceType: 'lead',
        sourceId: leadId,
      })

      return { code: 'OK', winnerContractorId, winnerProjectId: project.id, leadId, loserProjectIds }
    })
  } catch (err) {
    console.error('[acceptEstimate] failed', err)
    return fail('DB_ERROR')
  }

  if (outcome.code !== 'OK') return fail(outcome.code)

  // Post-commit side effects — best-effort.
  await markQuoteMessageAccepted(estimateId)
  const winnerConvo = await getProjectConversationId(outcome.winnerProjectId)
  if (winnerConvo) {
    await postSystemMessage(winnerConvo, 'Quote accepted — you won the job! 🎉').catch(() => {})
  }
  await Promise.all(
    outcome.loserProjectIds.map(async (pid) => {
      const convo = await getProjectConversationId(pid)
      if (convo) await postSystemMessage(convo, 'The homeowner accepted another contractor’s quote.').catch(() => {})
    }),
  )

  try {
    await inngest.send({
      name: INNGEST_EVENTS.QUOTE_ACCEPTED,
      data: {
        estimateId,
        leadId: outcome.leadId,
        winnerContractorId: outcome.winnerContractorId,
        projectId: outcome.winnerProjectId,
      },
    })
  } catch (err) {
    console.error('[acceptEstimate] inngest send failed (non-fatal)', err)
  }

  revalidatePath('/homeowner/quotes')
  revalidatePath('/homeowner/requests')
  revalidatePath('/contractor/jobs')
  revalidatePath('/contractor/messages')

  return { ok: true, projectId: outcome.winnerProjectId }
}
