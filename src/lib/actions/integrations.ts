'use server'

// Integrations — connect a Google place and sync its reviews/photos. Owner/admin
// only. v1 uses the Google Places API (browser-side fetch); these actions persist
// what the browser fetched. Imported data lands in external_reviews/external_media
// and never touches the native reviews table or the cached reputation columns.

import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser, getMembershipRole } from '@/lib/data/dashboard'
import { integrationConnections } from '@/lib/db/schema'
import {
  applyContent,
  upsertGoogleConnection,
  SelectionSchema,
  ContentSchema,
} from '@/lib/integrations/google-connect'

type Result<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

async function requireManager(): Promise<
  { ok: true; contractorId: string; userId: string } | { ok: false; error: string }
> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return { ok: false, error: 'No company found for your account.' }
  const role = await getMembershipRole(user.id, contractor.id)
  if (role !== 'owner' && role !== 'admin') {
    return { ok: false, error: 'Only owners and admins can manage integrations.' }
  }
  return { ok: true, contractorId: contractor.id, userId: user.id }
}

function revalidate() {
  revalidatePath('/contractor/settings/integrations')
  revalidatePath('/contractor/profile')
}

const ConnectSchema = z.object({
  selection: SelectionSchema,
  content: ContentSchema,
})

type SyncCounts = { connectionId: string; reviewCount: number; mediaCount: number }

export async function connectGooglePlace(input: unknown): Promise<Result<SyncCounts>> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }

  const parsed = ConnectSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Could not read that listing. Try again.' }
  const { selection, content } = parsed.data

  const connectionId = await upsertGoogleConnection({
    contractorId: ctx.contractorId,
    selection,
    connectedBy: ctx.userId,
  })

  try {
    await applyContent(connectionId, ctx.contractorId, content)
  } catch (err) {
    console.error('[integrations] connect: applyContent failed', err)
    await db
      .update(integrationConnections)
      .set({
        status: 'error',
        lastError: 'Connected, but saving the imported reviews and photos failed. Try Refresh.',
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, connectionId))
    revalidate()
    return { success: false, error: 'Connected, but importing failed. Use Refresh to retry.' }
  }
  revalidate()
  return {
    success: true,
    data: {
      connectionId,
      reviewCount: content.reviews.length,
      mediaCount: content.media.length,
    },
  }
}

export async function refreshGooglePlace(
  connectionId: string,
  content: unknown,
): Promise<Result<{ reviewCount: number; mediaCount: number }>> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }
  if (typeof connectionId !== 'string' || !connectionId) {
    return { success: false, error: 'Invalid connection.' }
  }

  const conn = await db
    .select({ id: integrationConnections.id })
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.id, connectionId),
        eq(integrationConnections.contractorId, ctx.contractorId),
      ),
    )
    .limit(1)
  if (conn.length === 0) return { success: false, error: 'That connection no longer exists.' }

  const parsed = ContentSchema.safeParse(content)
  if (!parsed.success) return { success: false, error: 'Could not read the latest data. Try again.' }

  try {
    await applyContent(connectionId, ctx.contractorId, parsed.data)
  } catch (err) {
    console.error('[integrations] refresh: applyContent failed', err)
    await db
      .update(integrationConnections)
      .set({ status: 'error', lastError: 'Saving the refreshed data failed.', updatedAt: new Date() })
      .where(eq(integrationConnections.id, connectionId))
    revalidate()
    return { success: false, error: 'Could not save the refreshed data. Try again.' }
  }
  await db
    .update(integrationConnections)
    .set({ status: 'active', lastSyncedAt: new Date(), lastError: null, updatedAt: new Date() })
    .where(eq(integrationConnections.id, connectionId))
  revalidate()
  return {
    success: true,
    data: {
      reviewCount: parsed.data.reviews.length,
      mediaCount: parsed.data.media.length,
    },
  }
}

export async function disconnectGooglePlace(connectionId: string): Promise<Result> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }
  if (typeof connectionId !== 'string' || !connectionId) {
    return { success: false, error: 'Invalid connection.' }
  }

  await db
    .delete(integrationConnections)
    .where(
      and(
        eq(integrationConnections.id, connectionId),
        eq(integrationConnections.contractorId, ctx.contractorId),
      ),
    )
  revalidate()
  return { success: true }
}
