'use server'

// Project stage transitions — the contractor drives a won job through to
// completion (docs §4.1 steps 6–7). Forward-only, guarded transitions; each
// writes an activity_log entry. Reaching `completed` schedules the review
// request (72h later, via Inngest).

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { activityLog, contractors, homeowners, leads, projects, users } from '@/lib/db/schema'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser } from '@/lib/data/dashboard'
import { getProjectConversationId, postEventMessage, postReviewMessage } from '@/lib/messaging/system'
import { sendNotification } from '@/lib/notifications'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import type { ProjectStage } from '@/lib/data/projects'

// Allowed manual moves. `estimate_sent` is set by sendEstimate and
// `in_progress`/`lost` by acceptEstimate — those aren't manual. The only manual
// move left is marking a won job completed.
const ALLOWED: Partial<Record<ProjectStage, ProjectStage[]>> = {
  in_progress: ['completed'],
}

type StageError = 'NO_COMPANY' | 'NOT_FOUND' | 'INVALID_TRANSITION' | 'DB_ERROR'
export type StageResult = { ok: true } | { ok: false; error: StageError; message: string }

const MESSAGES: Record<StageError, string> = {
  NO_COMPANY: 'Set up your company first.',
  NOT_FOUND: 'That project no longer exists.',
  INVALID_TRANSITION: 'That stage change isn’t allowed.',
  DB_ERROR: 'Could not update the project. Please try again.',
}

const fail = (error: StageError): StageResult => ({ ok: false, error, message: MESSAGES[error] })

const stageEnum = z.enum(projects.stage.enumValues)

export async function advanceProjectStage(projectId: string, toStage: string): Promise<StageResult> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return fail('NO_COMPANY')

  if (!z.string().uuid().safeParse(projectId).success) return fail('NOT_FOUND')
  const parsedStage = stageEnum.safeParse(toStage)
  if (!parsedStage.success) return fail('INVALID_TRANSITION')
  const target = parsedStage.data

  const [project] = await db
    .select({ id: projects.id, contractorId: projects.contractorId, stage: projects.stage })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project || project.contractorId !== contractor.id) return fail('NOT_FOUND')
  if (!ALLOWED[project.stage]?.includes(target)) return fail('INVALID_TRANSITION')

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(projects)
        .set({ stage: target, stageUpdatedAt: new Date() })
        .where(eq(projects.id, projectId))
      await tx.insert(activityLog).values({
        projectId,
        actor: 'contractor',
        actorUserId: user.id,
        action: 'stage_changed',
        metadata: { from: project.stage, to: target },
      })
    })
  } catch (err) {
    console.error('[advanceProjectStage] failed', err)
    return fail('DB_ERROR')
  }

  if (target === 'completed') {
    // Post-commit side effects — best-effort. The homeowner must learn the job
    // is done across every surface: an in-thread auto-message (which also
    // refreshes both parties' panels/timelines live), an in-app + email
    // notification, and a board refresh.
    await notifyJobCompleted(projectId, contractor.id).catch((err) =>
      console.error('[advanceProjectStage] completion notify failed (non-fatal)', err),
    )
    try {
      await inngest.send({ name: INNGEST_EVENTS.REVIEW_REQUEST_SCHEDULED, data: { projectId } })
    } catch (err) {
      console.error('[advanceProjectStage] review schedule failed (non-fatal)', err)
    }
  }

  revalidatePath('/contractor/jobs')
  revalidatePath('/contractor/messages')
  revalidatePath('/homeowner')
  revalidatePath('/homeowner/messages')
  return { ok: true }
}

/**
 * Tell the homeowner their job is complete: a personalized auto-message in the
 * thread (owned by the contractor company, so it sits on their side and the
 * homeowner reads a "marked complete" note), plus an in-app + email notification.
 */
async function notifyJobCompleted(projectId: string, contractorId: string): Promise<void> {
  const [row] = await db
    .select({
      companyName: contractors.companyName,
      homeownerUserId: users.id,
    })
    .from(projects)
    .innerJoin(leads, eq(leads.id, projects.leadId))
    .innerJoin(homeowners, eq(homeowners.id, leads.homeownerId))
    .innerJoin(users, eq(users.id, homeowners.userId))
    .innerJoin(contractors, eq(contractors.id, projects.contractorId))
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!row) return

  const conversationId = await getProjectConversationId(projectId)
  if (conversationId) {
    await postEventMessage(conversationId, 'Job marked completed.', {
      kind: 'event',
      event: 'job_completed',
      actorType: 'contractor',
      actorId: contractorId,
    }).catch((e) => console.error('[notifyJobCompleted] event message failed', e))
    // Inline review prompt — the homeowner can rate right in the thread.
    await postReviewMessage(conversationId, {
      kind: 'review',
      projectId,
      contractorId,
      status: 'pending',
    }).catch((e) => console.error('[notifyJobCompleted] review message failed', e))
  }

  await sendNotification({
    userId: row.homeownerUserId,
    type: 'SYSTEM',
    title: 'Your job is complete',
    body: `${row.companyName ?? 'Your contractor'} marked the job as completed. We’ll ask you for a quick review shortly.`,
    actionUrl: conversationId ? `/homeowner/messages/${conversationId}` : '/homeowner',
    entityType: 'SYSTEM',
    entityId: projectId,
    dedupKey: `job-completed:${projectId}`,
  }).catch((e) => console.error('[notifyJobCompleted] notification failed', e))
}
