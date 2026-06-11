'use server'

// Portfolio / case-study management for a contractor company. Owner/admin only.
// A case study (portfolio_projects) holds media items (portfolio_images) that
// are either a single image or a before/after pair. Case-study count is capped
// per plan (Free = 10, paid = unlimited).

import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser, getMembershipRole } from '@/lib/data/dashboard'
import { getPortfolioCap, MAX_IMAGES_PER_PROJECT } from '@/lib/data/portfolio'
import { portfolioImages, portfolioProjects } from '@/lib/db/schema'

type FieldErrors = Record<string, string>
type Result<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: FieldErrors }

async function requireManager(): Promise<
  { ok: true; contractorId: string } | { ok: false; error: string }
> {
  const user = await getRequiredUser('contractor')
  const contractor = await getContractorForUser(user.id)
  if (!contractor) return { ok: false, error: 'No company found for your account.' }
  const role = await getMembershipRole(user.id, contractor.id)
  if (role !== 'owner' && role !== 'admin') {
    return { ok: false, error: 'Only owners and admins can edit the portfolio.' }
  }
  return { ok: true, contractorId: contractor.id }
}

function revalidate() {
  revalidatePath('/contractor/settings/company')
  revalidatePath('/contractor/profile')
}

const ProjectSchema = z.object({
  title: z.string().trim().min(2, 'Add a title').max(120),
  description: z.string().trim().max(2000).optional().default(''),
  serviceSubtype: z.string().trim().max(60).optional().default(''),
  location: z.string().trim().max(120).optional().default(''),
})

export async function createPortfolioProject(
  input: unknown,
): Promise<Result<{ id: string }>> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }

  const parsed = ProjectSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Check the details.'
    return { success: false, error: msg, fieldErrors: { title: msg } }
  }

  const cap = await getPortfolioCap(ctx.contractorId)
  if (cap !== null) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(portfolioProjects)
      .where(eq(portfolioProjects.contractorId, ctx.contractorId))
    if (n >= cap) {
      return {
        success: false,
        error: `Your plan includes ${cap} case studies. Upgrade to add more.`,
      }
    }
  }

  const d = parsed.data
  const [row] = await db
    .insert(portfolioProjects)
    .values({
      contractorId: ctx.contractorId,
      title: d.title,
      description: d.description || null,
      serviceSubtype: d.serviceSubtype || null,
      location: d.location || null,
    })
    .returning({ id: portfolioProjects.id })

  revalidate()
  return { success: true, data: { id: row.id } }
}

const UpdateProjectSchema = ProjectSchema.partial().extend({
  id: z.string().min(1),
  coverImageUrl: z.string().url().nullable().optional(),
  isPublished: z.boolean().optional(),
})

export async function updatePortfolioProject(input: unknown): Promise<Result> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }

  const parsed = UpdateProjectSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Check the details.' }
  const { id, ...rest } = parsed.data

  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (rest.title !== undefined) set.title = rest.title
  if (rest.description !== undefined) set.description = rest.description || null
  if (rest.serviceSubtype !== undefined) set.serviceSubtype = rest.serviceSubtype || null
  if (rest.location !== undefined) set.location = rest.location || null
  if (rest.coverImageUrl !== undefined) set.coverImageUrl = rest.coverImageUrl
  if (rest.isPublished !== undefined) set.isPublished = rest.isPublished

  await db
    .update(portfolioProjects)
    .set(set)
    .where(
      and(
        eq(portfolioProjects.id, id),
        eq(portfolioProjects.contractorId, ctx.contractorId),
      ),
    )

  revalidate()
  return { success: true }
}

export async function deletePortfolioProject(id: string): Promise<Result> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }
  if (typeof id !== 'string' || !id) return { success: false, error: 'Invalid case study.' }

  await db
    .delete(portfolioProjects)
    .where(
      and(
        eq(portfolioProjects.id, id),
        eq(portfolioProjects.contractorId, ctx.contractorId),
      ),
    )

  revalidate()
  return { success: true }
}

const ImageSchema = z
  .object({
    projectId: z.string().min(1),
    kind: z.enum(['single', 'before_after']),
    imageUrl: z.string().url(),
    beforeUrl: z.string().url().nullable().optional(),
    caption: z.string().trim().max(160).optional().default(''),
  })
  .refine((v) => v.kind !== 'before_after' || !!v.beforeUrl, {
    message: 'A before/after needs both images.',
    path: ['beforeUrl'],
  })

export type PortfolioImageRow = {
  id: string
  kind: 'single' | 'before_after'
  imageUrl: string
  beforeUrl: string | null
  caption: string | null
  sortOrder: number
}

export async function addPortfolioImage(
  input: unknown,
): Promise<Result<PortfolioImageRow>> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }

  const parsed = ImageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Add an image.' }
  }
  const d = parsed.data

  const [project] = await db
    .select({ id: portfolioProjects.id, cover: portfolioProjects.coverImageUrl })
    .from(portfolioProjects)
    .where(
      and(
        eq(portfolioProjects.id, d.projectId),
        eq(portfolioProjects.contractorId, ctx.contractorId),
      ),
    )
    .limit(1)
  if (!project) return { success: false, error: 'That case study no longer exists.' }

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(portfolioImages)
    .where(eq(portfolioImages.projectId, d.projectId))
  if (n >= MAX_IMAGES_PER_PROJECT) {
    return {
      success: false,
      error: `A case study can have up to ${MAX_IMAGES_PER_PROJECT} images.`,
    }
  }

  const [row] = await db
    .insert(portfolioImages)
    .values({
      projectId: d.projectId,
      kind: d.kind,
      imageUrl: d.imageUrl,
      beforeUrl: d.kind === 'before_after' ? d.beforeUrl ?? null : null,
      caption: d.caption || null,
      sortOrder: n,
    })
    .returning({
      id: portfolioImages.id,
      kind: portfolioImages.kind,
      imageUrl: portfolioImages.imageUrl,
      beforeUrl: portfolioImages.beforeUrl,
      caption: portfolioImages.caption,
      sortOrder: portfolioImages.sortOrder,
    })

  // First image becomes the cover.
  if (!project.cover) {
    await db
      .update(portfolioProjects)
      .set({ coverImageUrl: d.imageUrl, updatedAt: new Date() })
      .where(eq(portfolioProjects.id, d.projectId))
  }

  revalidate()
  return { success: true, data: row }
}

export async function removePortfolioImage(id: string): Promise<Result> {
  const ctx = await requireManager()
  if (!ctx.ok) return { success: false, error: ctx.error }
  if (typeof id !== 'string' || !id) return { success: false, error: 'Invalid image.' }

  const [img] = await db
    .select({
      id: portfolioImages.id,
      projectId: portfolioImages.projectId,
      imageUrl: portfolioImages.imageUrl,
      contractorId: portfolioProjects.contractorId,
      cover: portfolioProjects.coverImageUrl,
    })
    .from(portfolioImages)
    .innerJoin(portfolioProjects, eq(portfolioProjects.id, portfolioImages.projectId))
    .where(eq(portfolioImages.id, id))
    .limit(1)
  if (!img || img.contractorId !== ctx.contractorId) {
    return { success: false, error: 'That image no longer exists.' }
  }

  await db.delete(portfolioImages).where(eq(portfolioImages.id, id))

  // If we removed the cover, fall back to another image (or clear it).
  if (img.cover === img.imageUrl) {
    const [next] = await db
      .select({ imageUrl: portfolioImages.imageUrl })
      .from(portfolioImages)
      .where(eq(portfolioImages.projectId, img.projectId))
      .orderBy(portfolioImages.sortOrder)
      .limit(1)
    await db
      .update(portfolioProjects)
      .set({ coverImageUrl: next?.imageUrl ?? null, updatedAt: new Date() })
      .where(eq(portfolioProjects.id, img.projectId))
  }

  revalidate()
  return { success: true }
}
