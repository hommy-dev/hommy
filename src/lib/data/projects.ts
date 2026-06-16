// Shared project/estimate types consumed by the Jobs data + actions layer.
// (The old per-project list/detail queries were retired when Leads + Projects
// merged into the unified Jobs board — see src/lib/data/jobs.ts.)

import { estimates, projects } from '@/lib/db/schema'

export type ProjectStage = (typeof projects.stage.enumValues)[number]
export type EstimateStatus = (typeof estimates.status.enumValues)[number]

export type EstimateSummary = {
  id: string
  status: EstimateStatus
  subtotal: string | null
  taxAmount: string | null
  total: string | null
  lineItems: Array<{ label: string; amount: string }>
  scopeNotes: string | null
  validUntil: Date | null
  sentAt: Date | null
  createdAt: Date
}
