// Portfolio (case studies) reads for the contractor settings + public profile.

import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  plans,
  portfolioImages,
  portfolioProjects,
  subscriptions,
} from '@/lib/db/schema'

export type PortfolioImageKind = (typeof portfolioImages.kind.enumValues)[number]

export type PortfolioImage = {
  id: string
  kind: PortfolioImageKind
  imageUrl: string
  beforeUrl: string | null
  caption: string | null
  sortOrder: number
}

export type PortfolioProject = {
  id: string
  title: string
  description: string | null
  serviceSubtype: string | null
  location: string | null
  coverImageUrl: string | null
  isPublished: boolean
  sortOrder: number
  images: PortfolioImage[]
}

/** Max images allowed inside a single case study (all plans). */
export const MAX_IMAGES_PER_PROJECT = 12

export async function getPortfolio(
  contractorId: string,
  opts?: { publishedOnly?: boolean },
): Promise<PortfolioProject[]> {
  const where = opts?.publishedOnly
    ? and(
        eq(portfolioProjects.contractorId, contractorId),
        eq(portfolioProjects.isPublished, true),
      )
    : eq(portfolioProjects.contractorId, contractorId)

  const projects = await db
    .select({
      id: portfolioProjects.id,
      title: portfolioProjects.title,
      description: portfolioProjects.description,
      serviceSubtype: portfolioProjects.serviceSubtype,
      location: portfolioProjects.location,
      coverImageUrl: portfolioProjects.coverImageUrl,
      isPublished: portfolioProjects.isPublished,
      sortOrder: portfolioProjects.sortOrder,
    })
    .from(portfolioProjects)
    .where(where)
    .orderBy(asc(portfolioProjects.sortOrder), desc(portfolioProjects.createdAt))

  if (projects.length === 0) return []

  const images = await db
    .select({
      id: portfolioImages.id,
      projectId: portfolioImages.projectId,
      kind: portfolioImages.kind,
      imageUrl: portfolioImages.imageUrl,
      beforeUrl: portfolioImages.beforeUrl,
      caption: portfolioImages.caption,
      sortOrder: portfolioImages.sortOrder,
    })
    .from(portfolioImages)
    .where(inArray(portfolioImages.projectId, projects.map((p) => p.id)))
    .orderBy(asc(portfolioImages.sortOrder), asc(portfolioImages.createdAt))

  const byProject = new Map<string, PortfolioImage[]>()
  for (const img of images) {
    const list = byProject.get(img.projectId) ?? []
    list.push({
      id: img.id,
      kind: img.kind,
      imageUrl: img.imageUrl,
      beforeUrl: img.beforeUrl,
      caption: img.caption,
      sortOrder: img.sortOrder,
    })
    byProject.set(img.projectId, list)
  }

  return projects.map((p) => ({ ...p, images: byProject.get(p.id) ?? [] }))
}

/**
 * Max case studies for a company, from the active plan's
 * `features.maxPortfolioProjects`. `null` = unlimited (paid plans). No active
 * plan falls back to the Free cap.
 */
export async function getPortfolioCap(contractorId: string): Promise<number | null> {
  const [sub] = await db
    .select({ features: plans.features })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        eq(subscriptions.contractorId, contractorId),
        eq(subscriptions.status, 'active'),
      ),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)

  if (!sub) return 10
  const v = (sub.features as Record<string, unknown>)?.maxPortfolioProjects
  return typeof v === 'number' ? v : null
}
