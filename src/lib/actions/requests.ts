'use server'

// Read-side action for the homeowner "My requests" board: fetch one request's
// full detail (incl. the interested contractors + their chats) for the Sheet,
// lazily on open. Authorization = the request must belong to the caller.

import { z } from 'zod'
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
