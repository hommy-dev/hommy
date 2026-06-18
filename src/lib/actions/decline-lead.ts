'use server'

// Decline a lead offer (docs §4.1 step 6 / §4.3). Flips the recipient to
// `declined`, decays the company's score (less with a reason, more without),
// and cascades the lead to one more eligible contractor.

import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { leadRecipients } from '@/lib/db/schema'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser } from '@/lib/data/dashboard'
import { recordScoreEvent } from '@/lib/reputation/score'
import { SCORE_DELTAS } from '@/lib/config/tunables'
import { offerToNextContractor } from '@/lib/leads/cascade'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'

type DeclineError = 'NO_COMPANY' | 'NOT_OFFERED' | 'DB_ERROR'
export type DeclineResult = { ok: true } | { ok: false; error: DeclineError; message: string }

const MESSAGES: Record<DeclineError, string> = {
  NO_COMPANY: 'Set up your company first.',
  NOT_OFFERED: 'This lead is no longer available to decline.',
  DB_ERROR: 'Could not decline this lead. Please try again.',
}

const fail = (error: DeclineError): DeclineResult => ({ ok: false, error, message: MESSAGES[error] })

const reasonSchema = z.string().trim().max(500).optional()

class NotOffered extends Error {}

export async function declineLead(leadId: string, reason?: string): Promise<DeclineResult> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return fail('NO_COMPANY')
  if (!z.string().uuid().safeParse(leadId).success) return fail('NOT_OFFERED')

  const parsedReason = reasonSchema.safeParse(reason)
  const cleanReason = parsedReason.success ? parsedReason.data?.trim() || '' : ''

  let cascadedTo: string | null = null
  try {
    cascadedTo = await db.transaction(async (tx) => {
      const updated = await tx
        .update(leadRecipients)
        .set({ status: 'declined', declineReason: cleanReason || null, respondedAt: new Date() })
        .where(
          and(
            eq(leadRecipients.leadId, leadId),
            eq(leadRecipients.contractorId, contractor.id),
            inArray(leadRecipients.status, ['offered', 'viewed']),
          ),
        )
        .returning({ id: leadRecipients.id })
      if (updated.length === 0) throw new NotOffered()

      // Declining WITH a reason is honest + cascades the lead fast → neutral.
      // Declining with no reason → a mild ding.
      await recordScoreEvent(tx, {
        contractorId: contractor.id,
        kind: cleanReason ? 'lead_ignored_with_reason' : 'lead_ignored_no_reason',
        delta: cleanReason ? SCORE_DELTAS.decline_with_reason : SCORE_DELTAS.decline_no_reason,
        sourceType: 'lead',
        sourceId: leadId,
        note: cleanReason || undefined,
      })

      return offerToNextContractor(tx, leadId)
    })
  } catch (err) {
    if (err instanceof NotOffered) return fail('NOT_OFFERED')
    console.error('[declineLead] failed', err)
    return fail('DB_ERROR')
  }

  if (cascadedTo) {
    try {
      await inngest.send({ name: INNGEST_EVENTS.LEAD_CREATED, data: { leadId } })
    } catch (err) {
      console.error('[declineLead] cascade notify failed (non-fatal)', err)
    }
  }

  revalidatePath('/contractor/jobs')
  return { ok: true }
}
