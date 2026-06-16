'use server'

// Project stage transitions — the contractor drives a won job through to
// completion (docs §4.1 steps 6–7). Forward-only, guarded transitions; each
// writes an activity_log entry. Reaching `completed` schedules the review
// request (72h later, via Inngest).

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { activityLog, projects } from '@/lib/db/schema'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser } from '@/lib/data/dashboard'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import type { ProjectStage } from '@/lib/data/projects'

// Allowed manual moves. `estimate_sent` is normally set by sendEstimate and
// `in_progress`/`lost` by acceptEstimate — those aren't manual here.
const ALLOWED: Partial<Record<ProjectStage, ProjectStage[]>> = {
  new_lead: ['contacted'],
  contacted: ['estimate_sent'],
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
    try {
      await inngest.send({ name: INNGEST_EVENTS.REVIEW_REQUEST_SCHEDULED, data: { projectId } })
    } catch (err) {
      console.error('[advanceProjectStage] review schedule failed (non-fatal)', err)
    }
  }

  revalidatePath('/contractor/jobs')
  revalidatePath('/contractor/messages')
  return { ok: true }
}
