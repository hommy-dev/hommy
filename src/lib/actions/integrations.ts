'use server'

// Integrations — connect a Google place and sync its reviews/photos. Owner/admin
// only. v1 uses the Google Places API (browser-side fetch); these actions persist
// what the browser fetched. Imported data lands in external_reviews/external_media
// and never touches the native reviews table or the cached reputation columns.

import { z } from 'zod'
import { and, eq, notInArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser, getMembershipRole } from '@/lib/data/dashboard'
import {
  externalMedia,
  externalReviews,
  integrationConnections,
} from '@/lib/db/schema'
import { GOOGLE_PLACES_PROVIDER } from '@/lib/integrations/providers'

type Result<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

/** `excluded.<col>` — the incoming row's value in an ON CONFLICT DO UPDATE set. */
const excluded = (col: string) => sql.raw(`excluded.${col}`)

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

const SelectionSchema = z.object({
  placeId: z.string().trim().min(1).max(512),
  name: z.string().trim().min(1).max(300),
  formattedAddress: z.string().trim().max(500).nullable().optional(),
  googleMapsUri: z.string().url().max(1000).nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  rating: z.number().nullable().optional(),
  userRatingCount: z.number().int().nullable().optional(),
})

const ReviewSchema = z.object({
  externalId: z.string().trim().min(1).max(512),
  authorName: z.string().trim().max(300).nullable().optional(),
  authorPhotoUrl: z.string().url().max(1000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  comment: z.string().trim().max(8000).nullable().optional(),
  sourceUrl: z.string().url().max(1000).nullable().optional(),
  postedAt: z.string().datetime().nullable().optional(),
})

const MediaSchema = z.object({
  externalId: z.string().trim().min(1).max(512),
  sourceUrl: z.string().url().max(2000),
  caption: z.string().trim().max(500).nullable().optional(),
  widthPx: z.number().int().nullable().optional(),
  heightPx: z.number().int().nullable().optional(),
  attributionHtml: z.string().max(4000).nullable().optional(),
})

const ContentSchema = z.object({
  reviews: z.array(ReviewSchema).max(50).default([]),
  media: z.array(MediaSchema).max(50).default([]),
})

const ConnectSchema = z.object({
  selection: SelectionSchema,
  content: ContentSchema,
})

/** Replace the imported reviews/photos for a connection with the latest fetch.
 *  Upserts by (connectionId, externalId) and prunes rows no longer returned. */
async function applyContent(
  connectionId: string,
  contractorId: string,
  content: z.infer<typeof ContentSchema>,
) {
  const reviewIds = content.reviews.map((r) => r.externalId)
  const mediaIds = content.media.map((m) => m.externalId)

  await db.transaction(async (tx) => {
    if (content.reviews.length > 0) {
      await tx
        .insert(externalReviews)
        .values(
          content.reviews.map((r) => ({
            connectionId,
            contractorId,
            provider: GOOGLE_PLACES_PROVIDER,
            externalId: r.externalId,
            authorName: r.authorName ?? null,
            authorPhotoUrl: r.authorPhotoUrl ?? null,
            rating: r.rating ?? null,
            comment: r.comment ?? null,
            sourceUrl: r.sourceUrl ?? null,
            postedAt: r.postedAt ? new Date(r.postedAt) : null,
          })),
        )
        .onConflictDoUpdate({
          target: [externalReviews.connectionId, externalReviews.externalId],
          set: {
            authorName: excluded('author_name'),
            authorPhotoUrl: excluded('author_photo_url'),
            rating: excluded('rating'),
            comment: excluded('comment'),
            sourceUrl: excluded('source_url'),
            postedAt: excluded('posted_at'),
          },
        })
    }
    // Prune reviews that are no longer present.
    await tx
      .delete(externalReviews)
      .where(
        reviewIds.length > 0
          ? and(
              eq(externalReviews.connectionId, connectionId),
              notInArray(externalReviews.externalId, reviewIds),
            )
          : eq(externalReviews.connectionId, connectionId),
      )

    if (content.media.length > 0) {
      await tx
        .insert(externalMedia)
        .values(
          content.media.map((m) => ({
            connectionId,
            contractorId,
            provider: GOOGLE_PLACES_PROVIDER,
            externalId: m.externalId,
            sourceUrl: m.sourceUrl,
            caption: m.caption ?? null,
            widthPx: m.widthPx ?? null,
            heightPx: m.heightPx ?? null,
            attributionHtml: m.attributionHtml ?? null,
          })),
        )
        .onConflictDoUpdate({
          target: [externalMedia.connectionId, externalMedia.externalId],
          set: {
            sourceUrl: excluded('source_url'),
            caption: excluded('caption'),
            widthPx: excluded('width_px'),
            heightPx: excluded('height_px'),
            attributionHtml: excluded('attribution_html'),
          },
        })
    }
    await tx
      .delete(externalMedia)
      .where(
        mediaIds.length > 0
          ? and(
              eq(externalMedia.connectionId, connectionId),
              notInArray(externalMedia.externalId, mediaIds),
            )
          : eq(externalMedia.connectionId, connectionId),
      )
  })
}

type SyncCounts = { connectionId: string; reviewCount: number; mediaCount: number }

export async function connectGooglePlace(input: unknown): Promise<Result<SyncCounts>> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }

  const parsed = ConnectSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Could not read that listing. Try again.' }
  const { selection, content } = parsed.data

  const meta: Record<string, unknown> = {
    formattedAddress: selection.formattedAddress ?? null,
    googleMapsUri: selection.googleMapsUri ?? null,
    lat: selection.lat ?? null,
    lng: selection.lng ?? null,
    rating: selection.rating ?? null,
    userRatingCount: selection.userRatingCount ?? null,
  }

  const [row] = await db
    .insert(integrationConnections)
    .values({
      contractorId: ctx.contractorId,
      provider: GOOGLE_PLACES_PROVIDER,
      status: 'active',
      externalAccountId: selection.placeId,
      externalAccountLabel: selection.name,
      externalAccountMeta: meta,
      connectedBy: ctx.userId,
      lastSyncedAt: new Date(),
      lastError: null,
    })
    .onConflictDoUpdate({
      target: [
        integrationConnections.contractorId,
        integrationConnections.provider,
        integrationConnections.externalAccountId,
      ],
      set: {
        status: 'active',
        externalAccountLabel: selection.name,
        externalAccountMeta: meta,
        lastSyncedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: integrationConnections.id })

  try {
    await applyContent(row.id, ctx.contractorId, content)
  } catch (err) {
    console.error('[integrations] connect: applyContent failed', err)
    await db
      .update(integrationConnections)
      .set({
        status: 'error',
        lastError: 'Connected, but saving the imported reviews and photos failed. Try Refresh.',
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, row.id))
    revalidate()
    return { success: false, error: 'Connected, but importing failed. Use Refresh to retry.' }
  }
  revalidate()
  return {
    success: true,
    data: {
      connectionId: row.id,
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
