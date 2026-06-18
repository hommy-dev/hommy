'use server'

// Read-side action for the homeowner "My requests" board: fetch one request's
// full detail (incl. the interested contractors + their chats) for the Sheet,
// lazily on open. Authorization = the request must belong to the caller.

import { z } from 'zod'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { leadRecipients, leads, projects } from '@/lib/db/schema'
import { getRequiredUser } from '@/lib/auth/session'
import {
  getHomeownerForUser,
  getHomeownerRequestDetail,
  type HomeownerRequestDetail,
} from '@/lib/data/homeowner'

export async function getRequestDetailAction(
  leadId: string,
): Promise<HomeownerRequestDetail | null> {
  const user = await getRequiredUser('homeowner')
  const ho = await getHomeownerForUser(user.id)
  if (!ho) return null
  if (!z.string().uuid().safeParse(leadId).success) return null
  return getHomeownerRequestDetail(leadId, ho.id, user.id)
}

export type CloseRequestResult = { ok: true } | { ok: false; message: string }

/**
 * Homeowner closes their own open job ("I hired someone" / "no longer needed").
 * Stops the fan-out: the lead goes `closed`, any still-active offers expire, and
 * their projects are marked lost — so contractors stop being prompted and the
 * homeowner's board reflects it. Awarded (already-hired) jobs run to completion
 * instead and can't be closed here.
 */
export async function closeRequest(leadId: string): Promise<CloseRequestResult> {
  const user = await getRequiredUser('homeowner')
  const ho = await getHomeownerForUser(user.id)
  if (!ho) return { ok: false, message: 'We couldn’t find your account.' }
  if (!z.string().uuid().safeParse(leadId).success) return { ok: false, message: 'That job no longer exists.' }

  try {
    const result = await db.transaction(async (tx) => {
      const [lead] = await tx
        .select({ status: leads.status })
        .from(leads)
        .where(and(eq(leads.id, leadId), eq(leads.homeownerId, ho.id)))
        .for('update')
        .limit(1)
      if (!lead) return 'NOT_FOUND' as const
      if (lead.status === 'awarded') return 'AWARDED' as const
      if (lead.status !== 'open') return 'ALREADY' as const

      const now = new Date()
      await tx.update(leads).set({ status: 'closed', closedAt: now }).where(eq(leads.id, leadId))
      // Release still-live offers so contractors stop being prompted.
      await tx
        .update(leadRecipients)
        .set({ status: 'expired', respondedAt: now })
        .where(and(eq(leadRecipients.leadId, leadId), inArray(leadRecipients.status, ['offered', 'viewed', 'engaged'])))
      // Any open projects on this lead are no longer winnable.
      await tx
        .update(projects)
        .set({ stage: 'lost', stageUpdatedAt: now })
        .where(and(eq(projects.leadId, leadId), ne(projects.stage, 'completed')))
      return 'OK' as const
    })

    if (result === 'NOT_FOUND') return { ok: false, message: 'That job no longer exists.' }
    if (result === 'AWARDED') return { ok: false, message: 'You’ve already hired for this job — it can’t be closed.' }
    if (result === 'ALREADY') return { ok: false, message: 'This job is already closed.' }
  } catch (err) {
    console.error('[closeRequest] failed', err)
    return { ok: false, message: 'Could not close the job. Please try again.' }
  }

  revalidatePath('/homeowner/requests')
  revalidatePath('/homeowner/messages')
  revalidatePath('/contractor/jobs')
  return { ok: true }
}
