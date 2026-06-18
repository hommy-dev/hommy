'use server'

// Fetch a contractor's public profile for the homeowner's "View profile" dialog.
// Any authenticated user may view it (it's the same info shown on a public
// profile). Lazy-loaded on dialog open so list rows stay cheap.

import { z } from 'zod'
import { getRequiredUserId } from '@/lib/auth/session'
import {
  getContractorPublicProfile,
  type ContractorPublicProfile,
} from '@/lib/data/contractor-profile'

export async function getContractorProfileAction(
  contractorId: string,
): Promise<ContractorPublicProfile | null> {
  await getRequiredUserId()
  if (!z.string().uuid().safeParse(contractorId).success) return null
  return getContractorPublicProfile(contractorId)
}
