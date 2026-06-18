'use server'

// Read-side action for the Jobs board: fetch a single job's full detail for the
// right-side Sheet, lazily (on open) rather than loading every card's detail up
// front. Authorization = the job must belong to the caller's company.

import { z } from 'zod'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser } from '@/lib/data/dashboard'
import { markLeadViewed } from '@/lib/actions/engage'
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

  const detail = await getJobDetailForContractor(leadId, contractor.id)

  // Opening an offered lead's detail = viewing it. Record it (free, idempotent —
  // only the first view on an `offered` row advances the status). This starts the
  // tighter post-view SLA clock and the softer "slow_response" decay path, and
  // lights up the "Viewed" timeline step. Reflect it in the returned detail so
  // the Sheet shows it without a round-trip.
  if (detail?.recipientStatus === 'offered') {
    await markLeadViewed(leadId).catch(() => {})
    detail.recipientStatus = 'viewed'
    const viewed = detail.milestones.find((m) => m.key === 'viewed')
    if (viewed && !viewed.at) viewed.at = new Date()
  }

  return detail
}

/** Control-room panel for a conversation. Works for either role (participant-gated). */
export async function getJobPanelAction(conversationId: string): Promise<JobPanel | null> {
  const user = await getRequiredUser()
  if (!z.string().uuid().safeParse(conversationId).success) return null
  return getJobPanelForConversation(conversationId, user.id)
}
