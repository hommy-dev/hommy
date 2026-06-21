// Data layer for the contractor Analytics page. Everything is range-aware
// (last 30 / 90 days) and contractor-scoped. Not cached (live). Money columns
// are Decimal strings — parsed to numbers here for charts, formatted in the UI.

import { db } from '@/lib/db'
import { and, eq, gte, isNotNull, or, sql } from 'drizzle-orm'
import {
  creditTransactions,
  estimates,
  leadRecipients,
  leads,
  projects,
  reviews,
  scoreEvents,
  serviceAreas,
} from '@/lib/db/schema'

const DAY = 86_400_000

type Bucket = { start: number; label: string }

/** Choose a sensible bucket granularity (in days) for a date range. */
function stepForRange(rangeDays: number): number {
  if (rangeDays <= 14) return 1 // daily
  if (rangeDays <= 90) return 7 // weekly
  return 30 // monthly
}

function buildBuckets(startMs: number, endMs: number, stepDays: number): Bucket[] {
  const fmt =
    stepDays >= 28
      ? new Intl.DateTimeFormat('en-US', { month: 'short' })
      : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
  const step = stepDays * DAY
  const out: Bucket[] = []
  for (let t = startMs; t < endMs; t += step) out.push({ start: t, label: fmt.format(new Date(t)) })
  return out.length > 0 ? out : [{ start: startMs, label: fmt.format(new Date(startMs)) }]
}

function bucketIndex(ms: number, startMs: number, stepDays: number, len: number): number {
  const i = Math.floor((ms - startMs) / (stepDays * DAY))
  return i >= 0 && i < len ? i : -1
}

const num = (v: string | null) => (v != null ? parseFloat(v) : 0)

export type KpiVal = { value: number; prev: number }

export type PerformanceAnalytics = {
  rangeDays: number
  kpis: {
    winRate: KpiVal
    revenueWon: KpiVal
    leads: KpiVal
    costPerWin: { value: number | null; prev: number | null }
  }
  revenueSeries: { x: string; won: number; quoted: number }[]
  leadsSpark: number[]
  winsSpark: number[]
  revenueSpark: number[]
}

export async function getPerformanceAnalytics(
  contractorId: string,
  rangeDays: number,
): Promise<PerformanceAnalytics> {
  const now = Date.now()
  const since = now - rangeDays * DAY
  const prevStart = now - 2 * rangeDays * DAY
  const prevStartDate = new Date(prevStart)

  const step = stepForRange(rangeDays)
  const buckets = buildBuckets(since, now, step)

  const [recips, ests, txns] = await Promise.all([
    db
      .select({
        status: leadRecipients.status,
        offeredAt: leadRecipients.offeredAt,
      })
      .from(leadRecipients)
      .where(and(eq(leadRecipients.contractorId, contractorId), gte(leadRecipients.offeredAt, prevStartDate))),
    db
      .select({
        total: estimates.total,
        status: estimates.status,
        sentAt: estimates.sentAt,
        acceptedAt: estimates.acceptedAt,
        createdAt: estimates.createdAt,
      })
      .from(estimates)
      .innerJoin(projects, eq(projects.id, estimates.projectId))
      .where(
        and(
          eq(projects.contractorId, contractorId),
          or(
            gte(estimates.sentAt, prevStartDate),
            gte(estimates.acceptedAt, prevStartDate),
            gte(estimates.createdAt, prevStartDate),
          ),
        ),
      ),
    db
      .select({ kind: creditTransactions.kind, amount: creditTransactions.amount, createdAt: creditTransactions.createdAt })
      .from(creditTransactions)
      .where(and(eq(creditTransactions.contractorId, contractorId), gte(creditTransactions.createdAt, prevStartDate))),
  ])

  const inRange = (d: Date | null) => d != null && d.getTime() >= since
  const inPrev = (d: Date | null) => d != null && d.getTime() >= prevStart && d.getTime() < since

  const rangeRecips = recips.filter((r) => inRange(r.offeredAt))
  const offered = rangeRecips.length
  const won = rangeRecips.filter((r) => r.status === 'won').length

  // ── Win rate + revenue (range vs prev) ──────────────────────────────────────
  const sentRange = ests.filter((e) => inRange(e.sentAt)).length
  const acceptedRange = ests.filter((e) => inRange(e.acceptedAt))
  const sentPrev = ests.filter((e) => inPrev(e.sentAt)).length
  const acceptedPrev = ests.filter((e) => inPrev(e.acceptedAt))
  const winRate = { value: sentRange > 0 ? (acceptedRange.length / sentRange) * 100 : 0, prev: sentPrev > 0 ? (acceptedPrev.length / sentPrev) * 100 : 0 }
  const revenueWon = { value: acceptedRange.reduce((s, e) => s + num(e.total), 0), prev: acceptedPrev.reduce((s, e) => s + num(e.total), 0) }

  const leadsRange = offered
  const leadsPrev = recips.filter((r) => inPrev(r.offeredAt)).length

  // ── Credit ROI ──────────────────────────────────────────────────────────────
  const spend = (kind: string, within: (d: Date) => boolean) =>
    txns.filter((t) => t.kind === kind && within(t.createdAt)).reduce((s, t) => s + Math.max(0, -t.amount), 0)
  const engageSpendRange = spend('lead_engagement', (d) => d.getTime() >= since)
  const wonSpendRange = spend('lead_won', (d) => d.getTime() >= since)
  const totalSpendRange = engageSpendRange + wonSpendRange
  const costPerWinValue = won > 0 ? Math.round(totalSpendRange / won) : null

  // ── Series ──────────────────────────────────────────────────────────────────
  const revenueSeries = buckets.map((b) => ({ x: b.label, won: 0, quoted: 0 }))
  for (const e of ests) {
    if (inRange(e.sentAt)) {
      const i = bucketIndex(e.sentAt!.getTime(), since, step, buckets.length)
      if (i >= 0) revenueSeries[i].quoted += num(e.total)
    }
    if (inRange(e.acceptedAt)) {
      const i = bucketIndex(e.acceptedAt!.getTime(), since, step, buckets.length)
      if (i >= 0) revenueSeries[i].won += num(e.total)
    }
  }

  // Sparkline series for the KPI tiles (same granularity as the range).
  const leadsSpark = buckets.map(() => 0)
  const winsSpark = buckets.map(() => 0)
  const revenueSpark = buckets.map(() => 0)
  for (const r of rangeRecips) {
    const i = bucketIndex(r.offeredAt.getTime(), since, step, buckets.length)
    if (i >= 0) leadsSpark[i] += 1
  }
  for (const e of acceptedRange) {
    const i = bucketIndex(e.acceptedAt!.getTime(), since, step, buckets.length)
    if (i >= 0) {
      winsSpark[i] += 1
      revenueSpark[i] += num(e.total)
    }
  }

  return {
    rangeDays,
    kpis: {
      winRate,
      revenueWon,
      leads: { value: leadsRange, prev: leadsPrev },
      costPerWin: { value: costPerWinValue, prev: null },
    },
    revenueSeries,
    leadsSpark,
    winsSpark,
    revenueSpark,
  }
}

// ── Coverage map (where you operate + where leads come from) ───────────────────

export type CoveragePoint = { name: string; lng: number; lat: number; leads?: number }
export type CoverageMapData = { hub: CoveragePoint | null; origins: CoveragePoint[] }

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

export async function getCoverageMap(contractorId: string, rangeDays: number): Promise<CoverageMapData> {
  const since = new Date(Date.now() - rangeDays * DAY)

  const [areas, leadRows] = await Promise.all([
    db
      .select({ lat: serviceAreas.lat, lng: serviceAreas.lng })
      .from(serviceAreas)
      .where(and(eq(serviceAreas.contractorId, contractorId), isNotNull(serviceAreas.lat), isNotNull(serviceAreas.lng))),
    db
      .select({ lat: leads.lat, lng: leads.lng, city: leads.city, state: leads.state })
      .from(leadRecipients)
      .innerJoin(leads, eq(leads.id, leadRecipients.leadId))
      .where(and(eq(leadRecipients.contractorId, contractorId), gte(leadRecipients.offeredAt, since), isNotNull(leads.lat), isNotNull(leads.lng))),
  ])

  // Dedupe lead origins by city (fall back to a rounded coordinate key).
  const byCity = new Map<string, CoveragePoint>()
  for (const l of leadRows) {
    if (l.lat == null || l.lng == null) continue
    const key = l.city ? `${l.city}${l.state ? `, ${l.state}` : ''}` : `${l.lat.toFixed(2)},${l.lng.toFixed(2)}`
    const existing = byCity.get(key)
    if (existing) existing.leads = (existing.leads ?? 0) + 1
    else byCity.set(key, { name: l.city ? key : 'Lead', lng: l.lng, lat: l.lat, leads: 1 })
  }
  const origins = [...byCity.values()].sort((a, b) => (b.leads ?? 0) - (a.leads ?? 0))

  let hub: CoveragePoint | null = null
  if (areas.length > 0) {
    hub = { name: 'Your base', lng: avg(areas.map((a) => a.lng as number)), lat: avg(areas.map((a) => a.lat as number)) }
  } else if (origins.length > 0) {
    hub = { name: 'Your area', lng: avg(origins.map((o) => o.lng)), lat: avg(origins.map((o) => o.lat)) }
  }

  return { hub, origins }
}

/** Net profile-score change over the range (for the reputation header chip). */
export async function getScoreTrend(contractorId: string, rangeDays: number): Promise<number> {
  const since = new Date(Date.now() - rangeDays * DAY)
  const [row] = await db
    .select({ sum: sql<number>`coalesce(sum(${scoreEvents.delta}), 0)::int` })
    .from(scoreEvents)
    .where(and(eq(scoreEvents.contractorId, contractorId), gte(scoreEvents.createdAt, since)))
  return row?.sum ?? 0
}

// ── Reputation extras (the merged section) ─────────────────────────────────────

export type ReviewAnalytics = {
  distribution: { star: number; count: number }[]
  total: number
  avg: number | null
}

export async function getReviewAnalytics(contractorId: string, rangeDays: number): Promise<ReviewAnalytics> {
  const since = new Date(Date.now() - rangeDays * DAY)
  const rows = await db
    .select({ rating: reviews.rating })
    .from(reviews)
    .where(and(eq(reviews.contractorId, contractorId), gte(reviews.createdAt, since)))

  const rated = rows.filter((r) => r.rating != null) as { rating: number }[]
  const distribution = [5, 4, 3, 2, 1].map((star) => ({ star, count: rated.filter((r) => r.rating === star).length }))
  const total = rated.length
  const avg = total > 0 ? rated.reduce((s, r) => s + r.rating, 0) / total : null

  return { distribution, total, avg }
}
