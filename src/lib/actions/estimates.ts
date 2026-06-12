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
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { estimates, projects } from '@/lib/db/schema'
import { getRequiredUser } from '@/lib/auth/session'
import { getContractorForUser } from '@/lib/data/dashboard'
import { computeTotals, lineItemAmount } from '@/lib/estimates/compute'
import { getProjectConversationId, postSystemMessage } from '@/lib/messaging/system'
import { formatCurrency } from '@/lib/format'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
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
    revalidatePath(`/contractor/projects/${ctx.input.projectId}`)
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
  try {
    const result = await db.transaction(async (tx) => {
      const draft = await upsertDraft(tx, ctx.contractorId, ctx.input)
      const token = randomBytes(24).toString('base64url')
      await tx
        .update(estimates)
        .set({ status: 'sent', sentAt: new Date(), acceptToken: token })
        .where(eq(estimates.id, draft.estimateId))
      await tx
        .update(projects)
        .set({ stage: 'estimate_sent', stageUpdatedAt: new Date() })
        .where(eq(projects.id, ctx.input.projectId))
      return { estimateId: draft.estimateId, total: draft.totals.total }
    })
    estimateId = result.estimateId
    total = result.total
  } catch (err) {
    if (err instanceof EstimateError) return fail(err.code)
    console.error('[sendEstimate] failed', err)
    return fail('DB_ERROR')
  }

  // Post-commit side effects — best-effort.
  const conversationId = await getProjectConversationId(ctx.input.projectId)
  if (conversationId) {
    await postSystemMessage(conversationId, `Quote sent — ${formatCurrency(total)}`).catch((e) =>
      console.error('[sendEstimate] system message failed', e),
    )
  }
  try {
    await inngest.send({
      name: INNGEST_EVENTS.QUOTE_SUBMITTED,
      data: { estimateId, projectId: ctx.input.projectId },
    })
  } catch (err) {
    console.error('[sendEstimate] inngest send failed (non-fatal)', err)
  }

  revalidatePath(`/contractor/projects/${ctx.input.projectId}`)
  revalidatePath('/homeowner/quotes')
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
