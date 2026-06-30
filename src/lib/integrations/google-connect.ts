// Background-safe core for the Google Places connect/sync flow. Pure DB work
// (no auth, no request context), so it's shared by BOTH the owner/admin server
// actions in src/lib/actions/integrations.ts AND the contractor-claimed Inngest
// job that auto-connects a recruited prospect's listing. Imported data lands in
// external_reviews / external_media and never touches the native reviews table or
// the cached reputation columns (contractors.avg_rating / total_reviews).

import { z } from 'zod'
import { and, eq, notInArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  externalMedia,
  externalReviews,
  integrationConnections,
} from '@/lib/db/schema'
import { GOOGLE_PLACES_PROVIDER } from '@/lib/integrations/providers'

/** `excluded.<col>` — the incoming row's value in an ON CONFLICT DO UPDATE set. */
const excluded = (col: string) => sql.raw(`excluded.${col}`)

export const SelectionSchema = z.object({
  placeId: z.string().trim().min(1).max(512),
  name: z.string().trim().min(1).max(300),
  formattedAddress: z.string().trim().max(500).nullable().optional(),
  googleMapsUri: z.string().url().max(1000).nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  rating: z.number().nullable().optional(),
  userRatingCount: z.number().int().nullable().optional(),
})

export const ReviewSchema = z.object({
  externalId: z.string().trim().min(1).max(512),
  authorName: z.string().trim().max(300).nullable().optional(),
  authorPhotoUrl: z.string().url().max(1000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  comment: z.string().trim().max(8000).nullable().optional(),
  sourceUrl: z.string().url().max(1000).nullable().optional(),
  postedAt: z.string().datetime().nullable().optional(),
})

export const MediaSchema = z.object({
  externalId: z.string().trim().min(1).max(512),
  sourceUrl: z.string().url().max(2000),
  caption: z.string().trim().max(500).nullable().optional(),
  widthPx: z.number().int().nullable().optional(),
  heightPx: z.number().int().nullable().optional(),
  attributionHtml: z.string().max(4000).nullable().optional(),
})

export const ContentSchema = z.object({
  reviews: z.array(ReviewSchema).max(50).default([]),
  media: z.array(MediaSchema).max(50).default([]),
})

export type Selection = z.infer<typeof SelectionSchema>
export type Content = z.infer<typeof ContentSchema>

/** Replace the imported reviews/photos for a connection with the latest fetch.
 *  Upserts by (connectionId, externalId) and prunes rows no longer returned. */
export async function applyContent(
  connectionId: string,
  contractorId: string,
  content: Content,
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

/** Upsert the integration_connections row for a (contractor, google, place_id).
 *  Returns the connection id. Keyed on the unique (contractorId, provider,
 *  externalAccountId) index, so it's safe to call repeatedly. */
export async function upsertGoogleConnection(args: {
  contractorId: string
  selection: Selection
  connectedBy: string | null
}): Promise<string> {
  const { contractorId, selection, connectedBy } = args
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
      contractorId,
      provider: GOOGLE_PLACES_PROVIDER,
      status: 'active',
      externalAccountId: selection.placeId,
      externalAccountLabel: selection.name,
      externalAccountMeta: meta,
      connectedBy,
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

  return row.id
}

export type ImportCounts = { connectionId: string; reviewCount: number; mediaCount: number }

/** Connect a place + import its content in one call. Used by both the manual
 *  connect action and the background auto-connect job. */
export async function importGooglePlace(args: {
  contractorId: string
  selection: Selection
  content: Content
  connectedBy: string | null
}): Promise<ImportCounts> {
  const connectionId = await upsertGoogleConnection({
    contractorId: args.contractorId,
    selection: args.selection,
    connectedBy: args.connectedBy,
  })
  await applyContent(connectionId, args.contractorId, args.content)
  return {
    connectionId,
    reviewCount: args.content.reviews.length,
    mediaCount: args.content.media.length,
  }
}
