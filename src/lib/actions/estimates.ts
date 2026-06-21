'use server'

// Estimate (= quote) actions — the contractor builds a line-item quote on a
// project, saves it as a draft, then sends it. Sending is the QUOTE step of
// docs §4.1: it flips the project to `estimate_sent`, drops a system note in the
// conversation, and notifies the homeowner. Acceptance (the win) is Phase 4.
//
// Totals are ALWAYS recomputed server-side from the line items — never trust a
// client-sent subtotal/total.

import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { estimates, projects } from '@/lib/db/schema'
import { getRequiredUser, getRequiredUserId } from '@/lib/auth/session'
import { getContractorForUser } from '@/lib/data/dashboard'
import { getConversationForUser } from '@/lib/data/conversations'
import { computeTotals, lineItemAmount } from '@/lib/estimates/compute'
import { getProjectConversationId, markQuoteMessageStatus, postQuoteMessage } from '@/lib/messaging/system'
import { formatCurrency } from '@/lib/format'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { contractors } from '@/lib/db/schema'
import type { Tx } from '@/lib/credits/ledger'

const lineItemSchema = z.object({
  label: z.string().trim().min(1, 'Add a description').max(120),
  amount: z.number().nonnegative().finite(),
})

const estimateInputSchema = z.object({
  projectId: z.string().uuid(),
  estimateId: z.string().uuid().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one line item').max(50),
  taxRatePct: z.number().min(0).max(100).default(0),
  scopeNotes: z.string().trim().max(2000).optional().default(''),
  validDays: z.number().int().min(1).max(365).default(30),
})

type EstimateInput = z.infer<typeof estimateInputSchema>
type EstimateErrorCode = 'NOT_FOUND' | 'NOT_AUTHORIZED' | 'NOT_EDITABLE'

class EstimateError extends Error {
  constructor(readonly code: EstimateErrorCode) {
    super(code)
  }
}

type Fail = { ok: false; error: EstimateErrorCode | 'INVALID_INPUT' | 'NO_COMPANY' | 'DB_ERROR'; message: string }

const MESSAGES: Record<Fail['error'], string> = {
  INVALID_INPUT: 'Please check the quote details.',
  NO_COMPANY: 'Set up your company first.',
  NOT_FOUND: 'That quote no longer exists.',
  NOT_AUTHORIZED: 'This project belongs to another company.',
  NOT_EDITABLE: 'A sent quote can’t be edited — start a new one.',
  DB_ERROR: 'Could not save the quote. Please try again.',
}

function fail(error: Fail['error']): Fail {
  return { ok: false, error, message: MESSAGES[error] }
}

export type SaveDraftResult = { ok: true; estimateId: string } | Fail
export type SendEstimateResult = { ok: true; estimateId: string } | Fail

export async function saveEstimateDraft(rawInput: unknown): Promise<SaveDraftResult> {
  const ctx = await authorize(rawInput)
  if (!ctx.ok) return ctx.fail

  try {
    const { estimateId } = await upsertDraft(db, ctx.contractorId, ctx.input)
    revalidatePath('/contractor/jobs')
    return { ok: true, estimateId }
  } catch (err) {
    if (err instanceof EstimateError) return fail(err.code)
    console.error('[saveEstimateDraft] failed', err)
    return fail('DB_ERROR')
  }
}

export async function sendEstimate(rawInput: unknown): Promise<SendEstimateResult> {
  const ctx = await authorize(rawInput)
  if (!ctx.ok) return ctx.fail

  let estimateId = ''
  let total = '0.00'
  let supersededIds: string[] = []
  try {
    const result = await db.transaction(async (tx) => {
      const draft = await upsertDraft(tx, ctx.contractorId, ctx.input)
      const token = randomBytes(24).toString('base64url')
      // One active quote per project: supersede any prior sent/draft estimates so
      // the homeowner never sees two acceptable quotes from the same company.
      const superseded = await tx
        .update(estimates)
        .set({ status: 'rejected' })
        .where(
          and(
            eq(estimates.projectId, ctx.input.projectId),
            inArray(estimates.status, ['sent', 'draft']),
            ne(estimates.id, draft.estimateId),
          ),
        )
        .returning({ id: estimates.id })
      await tx
        .update(estimates)
        .set({ status: 'sent', sentAt: new Date(), acceptToken: token })
        .where(eq(estimates.id, draft.estimateId))
      await tx
        .update(projects)
        .set({ stage: 'estimate_sent', stageUpdatedAt: new Date() })
        .where(eq(projects.id, ctx.input.projectId))
      return { estimateId: draft.estimateId, total: draft.totals.total, supersededIds: superseded.map((s) => s.id) }
    })
    estimateId = result.estimateId
    total = result.total
    supersededIds = result.supersededIds
  } catch (err) {
    if (err instanceof EstimateError) return fail(err.code)
    console.error('[sendEstimate] failed', err)
    return fail('DB_ERROR')
  }

  // Post-commit side effects — best-effort. Flip any superseded quote cards so
  // they stop offering Accept, then post a rich quote card so both parties see
  // (and the homeowner can accept) the new quote inside the thread.
  if (supersededIds.length > 0) {
    await markQuoteMessageStatus(supersededIds, 'rejected').catch((e) =>
      console.error('[sendEstimate] supersede cards failed', e),
    )
  }
  const conversationId = await getProjectConversationId(ctx.input.projectId)
  if (conversationId) {
    await postQuoteMessage(conversationId, `Quote sent — ${formatCurrency(total)}`, {
      kind: 'quote',
      estimateId,
      total,
      status: 'sent',
    }).catch((e) => console.error('[sendEstimate] quote message failed', e))
  }
  try {
    await inngest.send({
      name: INNGEST_EVENTS.QUOTE_SUBMITTED,
      data: { estimateId, projectId: ctx.input.projectId },
    })
  } catch (err) {
    console.error('[sendEstimate] inngest send failed (non-fatal)', err)
  }

  revalidatePath('/contractor/jobs')
  revalidatePath('/contractor/messages')
  revalidatePath('/homeowner')
  revalidatePath('/homeowner/messages')
  return { ok: true, estimateId }
}

// ── internals ──

type AuthOk = { ok: true; contractorId: string; input: EstimateInput }
type AuthFail = { ok: false; fail: Fail }

async function authorize(rawInput: unknown): Promise<AuthOk | AuthFail> {
  const user = await getRequiredUser('contractor')
  const parsed = estimateInputSchema.safeParse(rawInput)
  if (!parsed.success) return { ok: false, fail: fail('INVALID_INPUT') }

  const contractor = await getContractorForUser(user.id)
  if (!contractor) return { ok: false, fail: fail('NO_COMPANY') }

  return { ok: true, contractorId: contractor.id, input: parsed.data }
}

/** Create or update a DRAFT estimate for the project. Verifies ownership. */
async function upsertDraft(
  executor: typeof db | Tx,
  contractorId: string,
  input: EstimateInput,
): Promise<{ estimateId: string; totals: ReturnType<typeof computeTotals> }> {
  const [project] = await executor
    .select({ id: projects.id, contractorId: projects.contractorId })
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1)
  if (!project) throw new EstimateError('NOT_FOUND')
  if (project.contractorId !== contractorId) throw new EstimateError('NOT_AUTHORIZED')

  const totals = computeTotals(input.lineItems, input.taxRatePct)
  const values = {
    lineItems: input.lineItems.map((li) => ({ label: li.label, amount: lineItemAmount(li.amount) })),
    taxRate: (input.taxRatePct / 100).toFixed(4),
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    total: totals.total,
    scopeNotes: input.scopeNotes || null,
    validUntil: new Date(Date.now() + input.validDays * 24 * 60 * 60 * 1000),
  }

  if (input.estimateId) {
    const [existing] = await executor
      .select({ id: estimates.id, projectId: estimates.projectId, status: estimates.status })
      .from(estimates)
      .where(eq(estimates.id, input.estimateId))
      .limit(1)
    if (!existing || existing.projectId !== input.projectId) throw new EstimateError('NOT_FOUND')
    if (existing.status !== 'draft') throw new EstimateError('NOT_EDITABLE')
    await executor.update(estimates).set(values).where(eq(estimates.id, input.estimateId))
    return { estimateId: input.estimateId, totals }
  }

  const [created] = await executor
    .insert(estimates)
    .values({ projectId: input.projectId, status: 'draft', ...values })
    .returning({ id: estimates.id })
  return { estimateId: created.id, totals }
}

// ── view (read) ──

export type QuoteDetail = {
  estimateId: string
  contractorName: string | null
  status: EstimateStatusValue
  subtotal: string | null
  taxAmount: string | null
  total: string | null
  lineItems: Array<{ label: string; amount: string }>
  scopeNotes: string | null
  validUntil: string | null
}

type EstimateStatusValue = (typeof estimates.status.enumValues)[number]

export type ViewQuoteResult = { ok: true; quote: QuoteDetail } | { ok: false; message: string }

/**
 * Full quote detail for the in-thread "View quote" dialog. Authorized to EITHER
 * party of the project's conversation (homeowner or a member of the owning
 * company), so both can inspect line items, scope, and validity from the chat.
 */
export async function getEstimateForViewer(estimateId: string): Promise<ViewQuoteResult> {
  if (!z.string().uuid().safeParse(estimateId).success) {
    return { ok: false, message: 'That quote no longer exists.' }
  }
  const userId = await getRequiredUserId()

  const [row] = await db
    .select({
      id: estimates.id,
      projectId: estimates.projectId,
      status: estimates.status,
      subtotal: estimates.subtotal,
      taxAmount: estimates.taxAmount,
      total: estimates.total,
      lineItems: estimates.lineItems,
      scopeNotes: estimates.scopeNotes,
      validUntil: estimates.validUntil,
      contractorName: contractors.companyName,
    })
    .from(estimates)
    .innerJoin(projects, eq(projects.id, estimates.projectId))
    .innerJoin(contractors, eq(contractors.id, projects.contractorId))
    .where(eq(estimates.id, estimateId))
    .limit(1)
  if (!row) return { ok: false, message: 'That quote no longer exists.' }

  // Authorize: the caller must be a participant of the project's conversation.
  const conversationId = await getProjectConversationId(row.projectId)
  const convo = conversationId ? await getConversationForUser(conversationId, userId) : null
  if (!convo) return { ok: false, message: 'You don’t have access to this quote.' }

  return {
    ok: true,
    quote: {
      estimateId: row.id,
      contractorName: row.contractorName,
      status: row.status,
      subtotal: row.subtotal,
      taxAmount: row.taxAmount,
      total: row.total,
      lineItems: row.lineItems,
      scopeNotes: row.scopeNotes,
      validUntil: row.validUntil ? row.validUntil.toISOString() : null,
    },
  }
}
