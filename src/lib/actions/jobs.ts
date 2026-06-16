'use server'

// Read-side action for the Jobs board: fetch a single job's full detail for the
// right-side Sheet, lazily (on open) rather than loading every card's detail up
// front. Authorization = the job must belong to the caller's company.

import { z } from 'zod'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser } from '@/lib/data/dashboard'
import {
  getJobDetailForContractor,
  getJobPanelForConversation,
  type JobDetail,
  type JobPanel,
} from '@/lib/data/jobs'

export async function getJobDetailAction(leadId: string): Promise<JobDetail | null> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return null
  if (!z.string().uuid().safeParse(leadId).success) return null
  return getJobDetailForContractor(leadId, contractor.id)
}

/** Control-room panel for a conversation. Works for either role (participant-gated). */
export async function getJobPanelAction(conversationId: string): Promise<JobPanel | null> {
  const user = await getRequiredUser()
  if (!z.string().uuid().safeParse(conversationId).success) return null
  return getJobPanelForConversation(conversationId, user.id)
}
