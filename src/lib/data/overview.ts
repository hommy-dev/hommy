// Data layer for the contractor Overview (the command-center home page).
//
// Everything here is "now" state plus a 7-day pulse per headline metric, so the
// KPI cards can carry a mini trend chart (like an analytics dashboard) without
// the page turning into full Analytics. Not cached (all live). Reuses the
// unified board (getContractorJobs) as the single source of truth for pipeline,
// unread, and quote state, so Overview can never disagree with the Jobs board.

import { cache } from 'react'
import { db } from '@/lib/db'
import { and, desc, eq, gte } from 'drizzle-orm'
import {
  contractors,
  creditTransactions,
  notifications,
  scoreEvents,
} from '@/lib/db/schema'
import {
  getDashboardStats,
  countNewLeadOffers,
} from '@/lib/data/dashboard'
import { getContractorJobs, type BoardStatus } from '@/lib/data/jobs'

export type PipelineStage = {
  status: Exclude<BoardStatus, 'lost'>
  label: string
  count: number
}

export type ActivityItem = {
  id: string
  type: string
  title: string
  body: string
  actionUrl: string | null
  createdAt: Date
  isRead: boolean
}

export type ContractorOverview = {
  openOffers: number
  activeJobs: number
  unreadConversations: number
  newLeadsWaiting: number
  quotesAwaiting: number
  /** Deals in motion (everything except done + lost). */
  activeDeals: number
  pipeline: PipelineStage[]

  // Per-KPI 7-day series (oldest → today) + the net change across that window.
  offersSeries: number[]
  offersTrend7d: number
  jobsSeries: number[]
  jobsTrend7d: number
  creditsSeries: number[]
  creditsTrend7d: number
  standingSeries: number[]
  standingTrend7d: number

  recentActivity: ActivityItem[]
}

const PIPELINE_ORDER: { status: PipelineStage['status']; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'talking', label: 'Talking' },
  { status: 'quoted', label: 'Quoted' },
  { status: 'won', label: 'Won' },
  { status: 'done', label: 'Done' },
]

const DAY_MS = 24 * 60 * 60 * 1000

/** Sum daily values into 7 buckets (oldest → today). `val` defaults to 1 (counts). */
function bucketDaily(items: { at: Date; val?: number }[], now: number): number[] {
  const buckets = new Array(7).fill(0) as number[]
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const startMs = start.getTime()
  for (const it of items) {
    const daysAgo = Math.floor((startMs - new Date(it.at).setHours(0, 0, 0, 0)) / DAY_MS)
    if (daysAgo >= 0 && daysAgo < 7) buckets[6 - daysAgo] += it.val ?? 1
  }
  return buckets
}

/** Reconstruct the 7 end-of-day values of a stock (balance, score) given its
 *  current value and the per-day net change. end[today] = current. */
function reconstructStock(current: number, dailyDelta: number[], clampZero = false): number[] {
  const out = new Array(7).fill(0) as number[]
  out[6] = current
  for (let i = 6; i >= 1; i--) {
    const v = out[i] - dailyDelta[i]
    out[i - 1] = clampZero ? Math.max(0, v) : v
  }
  return out
}

export const getContractorOverview = cache(async (
  contractorId: string,
  userId: string,
): Promise<ContractorOverview> => {
  const now = Date.now()
  const weekAgo = new Date(now - 7 * DAY_MS)

  const [stats, newLeadsWaiting, jobs, activity, [self], creditTxns, scoreTxns] =
    await Promise.all([
      getDashboardStats(contractorId),
      countNewLeadOffers(contractorId),
      getContractorJobs(contractorId, userId),
      db
        .select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          body: notifications.body,
          actionUrl: notifications.actionUrl,
          createdAt: notifications.createdAt,
          isRead: notifications.isRead,
        })
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(6),
      db
        .select({ creditBalance: contractors.creditBalance, profileScore: contractors.profileScore })
        .from(contractors)
        .where(eq(contractors.id, contractorId))
        .limit(1),
      db
        .select({ amount: creditTransactions.amount, createdAt: creditTransactions.createdAt })
        .from(creditTransactions)
        .where(and(eq(creditTransactions.contractorId, contractorId), gte(creditTransactions.createdAt, weekAgo))),
      db
        .select({ delta: scoreEvents.delta, createdAt: scoreEvents.createdAt })
        .from(scoreEvents)
        .where(and(eq(scoreEvents.contractorId, contractorId), gte(scoreEvents.createdAt, weekAgo))),
    ])

  // Derive everything board-related from the one job list.
  const counts = new Map<BoardStatus, number>()
  let unreadConversations = 0
  let quotesAwaiting = 0
  for (const j of jobs) {
    counts.set(j.boardStatus, (counts.get(j.boardStatus) ?? 0) + 1)
    if (j.hasUnread) unreadConversations += 1
    if (j.latestQuoteStatus === 'sent') quotesAwaiting += 1
  }

  const pipeline: PipelineStage[] = PIPELINE_ORDER.map((s) => ({
    status: s.status,
    label: s.label,
    count: counts.get(s.status) ?? 0,
  }))
  const activeDeals =
    (counts.get('new') ?? 0) +
    (counts.get('talking') ?? 0) +
    (counts.get('quoted') ?? 0) +
    (counts.get('won') ?? 0)

  // Flow series: leads received per day, deals engaged per day.
  const offersSeries = bucketDaily(jobs.map((j) => ({ at: j.offeredAt })), now)
  const jobsSeries = bucketDaily(
    jobs.filter((j) => j.engagedAt).map((j) => ({ at: j.engagedAt as Date })),
    now,
  )

  // Stock series: end-of-day credit balance and profile score, rebuilt from the ledgers.
  const creditDaily = bucketDaily(creditTxns.map((t) => ({ at: t.createdAt, val: t.amount })), now)
  const scoreDaily = bucketDaily(scoreTxns.map((t) => ({ at: t.createdAt, val: t.delta })), now)
  const creditsSeries = reconstructStock(self?.creditBalance ?? 0, creditDaily)
  const standingSeries = reconstructStock(self?.profileScore ?? 0, scoreDaily, true)

  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

  return {
    openOffers: stats.openOffers,
    activeJobs: stats.activeProjects,
    unreadConversations,
    newLeadsWaiting,
    quotesAwaiting,
    activeDeals,
    pipeline,
    offersSeries,
    offersTrend7d: sum(offersSeries),
    jobsSeries,
    jobsTrend7d: sum(jobsSeries),
    creditsSeries,
    creditsTrend7d: sum(creditDaily),
    standingSeries,
    standingTrend7d: sum(scoreDaily),
    recentActivity: activity,
  }
})
