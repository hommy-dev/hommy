// Admin reads for the recruitment engine. NOT cached — like the rest of the
// admin data layer (src/lib/data/admin.ts), demand must be fresh. Authorization
// is enforced by the caller (admin pages call getRequiredUser('admin')).

import { db } from '@/lib/db'
import { and, desc, eq, gte, ilike, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm'
import { leads, contractorProspects, prospectEnrichmentJobs, contractors } from '@/lib/db/schema'

const ADMIN_LIST_LIMIT = 200

export type UncoveredDemandRow = {
  state: string | null
  city: string | null
  /** How many open leads are awaiting coverage in this place. */
  count: number
  oldest: Date
  newest: Date
  /** Demand centroid (avg of the leads' coords) — drives "find roofers" here. */
  lat: number | null
  lng: number | null
}

/**
 * Where homeowners posted but no verified contractor covers the area — the
 * recruitment target list, ranked by how much demand is waiting. Inverse of the
 * city-supply reads in src/lib/data/locations.ts.
 */
export async function getUncoveredDemand(): Promise<UncoveredDemandRow[]> {
  const rows = await db
    .select({
      state: leads.state,
      city: leads.city,
      count: sql<number>`count(*)::int`,
      oldest: sql<Date>`min(${leads.createdAt})`,
      newest: sql<Date>`max(${leads.createdAt})`,
      lat: sql<number | null>`avg(${leads.lat})::float8`,
      lng: sql<number | null>`avg(${leads.lng})::float8`,
    })
    .from(leads)
    .where(and(eq(leads.awaitingCoverage, true), eq(leads.status, 'open')))
    .groupBy(leads.state, leads.city)
    .orderBy(desc(sql`count(*)`))
    .limit(ADMIN_LIST_LIMIT)

  return rows.map((r) => ({
    state: r.state,
    city: r.city,
    count: r.count,
    oldest: r.oldest,
    newest: r.newest,
    lat: r.lat,
    lng: r.lng,
  }))
}

// ── Recruitment command-center reads ─────────────────────────────────────────
// Funnel/enrichment/outreach visibility for /admin/recruitment. All counts are
// fresh (no cache). Every fn takes an optional serviceId so the platform stays
// multi-vertical; `undefined` scope is a no-op inside and(...).

/** Optional service filter — undefined when not scoping (and(...) ignores it). */
function scope(serviceId?: string): SQL | undefined {
  return serviceId ? eq(contractorProspects.serviceId, serviceId) : undefined
}

export type RecruitmentOverview = {
  kpis: {
    totalProspects: number
    withEmail: number
    emailsSent: number
    reachableRate: number // 0–1
    conversionRate: number // 0–1, converted / emailed
  }
  funnel: { discovered: number; withEmail: number; emailed: number; converted: number }
  lost: { noEmail: number; bounced: number; suppressed: number }
  outreachBreakdown: { status: string; count: number }[]
  enrichmentJobs: { queued: number; processing: number; done: number; error: number }
  timeseries: { date: string; label: string; discovered: number; emailed: number }[]
}

/** Funnel counts, KPIs, outreach split, enrichment-job health, and a 30-day trend. */
export async function getRecruitmentOverview(serviceId?: string): Promise<RecruitmentOverview> {
  const p = contractorProspects
  const labelFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

  // One aggregate row (PG FILTER) for the whole funnel + lost buckets + emails sent.
  const aggQuery = db
    .select({
      total: sql<number>`count(*)::int`,
      withEmail: sql<number>`count(*) filter (where ${p.enrichmentStatus} in ('email_found','email_verified'))::int`,
      emailed: sql<number>`count(*) filter (where ${p.outreachCount} > 0)::int`,
      converted: sql<number>`count(*) filter (where ${p.convertedToContractorId} is not null)::int`,
      emailsSent: sql<number>`coalesce(sum(${p.outreachCount}), 0)::int`,
      noEmail: sql<number>`count(*) filter (where ${p.enrichmentStatus} = 'no_email')::int`,
      bounced: sql<number>`count(*) filter (where ${p.outreachStatus} = 'bounced')::int`,
      suppressed: sql<number>`count(*) filter (where ${p.outreachStatus} = 'suppressed')::int`,
    })
    .from(p)
    .where(and(scope(serviceId)))

  const breakdownQuery = db
    .select({ status: p.outreachStatus, count: sql<number>`count(*)::int` })
    .from(p)
    .where(and(scope(serviceId)))
    .groupBy(p.outreachStatus)

  const jobsQuery = serviceId
    ? db
        .select({ status: prospectEnrichmentJobs.status, count: sql<number>`count(*)::int` })
        .from(prospectEnrichmentJobs)
        .innerJoin(p, eq(p.id, prospectEnrichmentJobs.prospectId))
        .where(eq(p.serviceId, serviceId))
        .groupBy(prospectEnrichmentJobs.status)
    : db
        .select({ status: prospectEnrichmentJobs.status, count: sql<number>`count(*)::int` })
        .from(prospectEnrichmentJobs)
        .groupBy(prospectEnrichmentJobs.status)

  const since = sql`now() - interval '29 days'`
  const discByDayQuery = db
    .select({
      d: sql<string>`to_char(date_trunc('day', ${p.createdAt}), 'YYYY-MM-DD')`,
      c: sql<number>`count(*)::int`,
    })
    .from(p)
    .where(and(scope(serviceId), gte(p.createdAt, since)))
    .groupBy(sql`1`)
  const emailedByDayQuery = db
    .select({
      d: sql<string>`to_char(date_trunc('day', ${p.lastOutreachAt}), 'YYYY-MM-DD')`,
      c: sql<number>`count(*)::int`,
    })
    .from(p)
    .where(and(scope(serviceId), isNotNull(p.lastOutreachAt), gte(p.lastOutreachAt, since)))
    .groupBy(sql`1`)

  const [aggRows, breakdown, jobRows, discByDay, emailedByDay] = await Promise.all([
    aggQuery,
    breakdownQuery,
    jobsQuery,
    discByDayQuery,
    emailedByDayQuery,
  ])
  const agg = aggRows[0]

  // Build a continuous 30-point series so zero-days still render.
  const discMap = new Map(discByDay.map((r) => [r.d, r.c]))
  const emailMap = new Map(emailedByDay.map((r) => [r.d, r.c]))
  const timeseries: RecruitmentOverview['timeseries'] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(now)
    dt.setUTCDate(now.getUTCDate() - i)
    const date = dt.toISOString().slice(0, 10)
    timeseries.push({
      date,
      label: labelFmt.format(dt),
      discovered: discMap.get(date) ?? 0,
      emailed: emailMap.get(date) ?? 0,
    })
  }

  const jobs = { queued: 0, processing: 0, done: 0, error: 0 }
  for (const r of jobRows) {
    if (r.status === 'queued') jobs.queued += r.count
    else if (r.status === 'claimed') jobs.processing += r.count
    else if (r.status === 'done') jobs.done += r.count
    else if (r.status === 'error') jobs.error += r.count
  }

  const total = agg?.total ?? 0
  const withEmail = agg?.withEmail ?? 0
  const emailed = agg?.emailed ?? 0
  const converted = agg?.converted ?? 0

  return {
    kpis: {
      totalProspects: total,
      withEmail,
      emailsSent: agg?.emailsSent ?? 0,
      reachableRate: total ? withEmail / total : 0,
      conversionRate: emailed ? converted / emailed : 0,
    },
    funnel: { discovered: total, withEmail, emailed, converted },
    lost: { noEmail: agg?.noEmail ?? 0, bounced: agg?.bounced ?? 0, suppressed: agg?.suppressed ?? 0 },
    outreachBreakdown: breakdown.map((b) => ({ status: b.status, count: b.count })),
    enrichmentJobs: jobs,
    timeseries,
  }
}

export type ProspectRow = {
  id: string
  companyName: string | null
  city: string | null
  state: string | null
  email: string | null
  emailConfidence: number | null
  enrichmentStatus: string
  outreachStatus: string
  outreachCount: number
  rating: string | null
  reviewCount: number | null
  lastOutreachAt: Date | null
  createdAt: Date
  converted: boolean
}

const PROSPECT_COLUMNS = {
  id: contractorProspects.id,
  companyName: contractorProspects.companyName,
  city: contractorProspects.city,
  state: contractorProspects.state,
  email: contractorProspects.email,
  emailConfidence: contractorProspects.emailConfidence,
  enrichmentStatus: contractorProspects.enrichmentStatus,
  outreachStatus: contractorProspects.outreachStatus,
  outreachCount: contractorProspects.outreachCount,
  rating: contractorProspects.rating,
  reviewCount: contractorProspects.reviewCount,
  lastOutreachAt: contractorProspects.lastOutreachAt,
  createdAt: contractorProspects.createdAt,
  convertedToContractorId: contractorProspects.convertedToContractorId,
} as const

/** Browseable prospect list (latest first, capped). Filters compose in SQL. */
export async function listProspects(
  opts: {
    serviceId?: string
    enrichmentStatus?: string
    outreachStatus?: string
    hasEmail?: boolean
    search?: string
    limit?: number
  } = {},
): Promise<ProspectRow[]> {
  const p = contractorProspects
  const conditions: (SQL | undefined)[] = [scope(opts.serviceId)]
  if (opts.enrichmentStatus) conditions.push(eq(p.enrichmentStatus, opts.enrichmentStatus))
  if (opts.outreachStatus) conditions.push(eq(p.outreachStatus, opts.outreachStatus))
  if (opts.hasEmail === true) conditions.push(isNotNull(p.email))
  if (opts.hasEmail === false) conditions.push(isNull(p.email))
  const q = opts.search?.trim()
  if (q) {
    const like = `%${q}%`
    conditions.push(or(ilike(p.companyName, like), ilike(p.city, like), ilike(p.email, like)))
  }

  const rows = await db
    .select(PROSPECT_COLUMNS)
    .from(p)
    .where(and(...conditions))
    .orderBy(desc(p.createdAt))
    .limit(opts.limit ?? ADMIN_LIST_LIMIT)

  return rows.map((r) => ({
    id: r.id,
    companyName: r.companyName,
    city: r.city,
    state: r.state,
    email: r.email,
    emailConfidence: r.emailConfidence,
    enrichmentStatus: r.enrichmentStatus,
    outreachStatus: r.outreachStatus,
    outreachCount: r.outreachCount,
    rating: r.rating,
    reviewCount: r.reviewCount,
    lastOutreachAt: r.lastOutreachAt,
    createdAt: r.createdAt,
    converted: r.convertedToContractorId != null,
  }))
}

export type ProspectDetail = ProspectRow & {
  phone: string | null
  website: string | null
  domain: string | null
  source: string
  serviceId: string | null
  convertedAt: Date | null
  convertedContractor: { id: string; companyName: string | null } | null
  job: { status: string; attempts: number; lastError: string | null; updatedAt: Date } | null
}

/** Full prospect record + its enrichment job + converted contractor (for the detail sheet). */
export async function getProspectDetail(id: string): Promise<ProspectDetail | null> {
  const p = contractorProspects
  const j = prospectEnrichmentJobs
  const [row] = await db
    .select({
      ...PROSPECT_COLUMNS,
      phone: p.phone,
      website: p.website,
      domain: p.domain,
      source: p.source,
      serviceId: p.serviceId,
      convertedAt: p.convertedAt,
      contractorId: contractors.id,
      contractorName: contractors.companyName,
      jobStatus: j.status,
      jobAttempts: j.attempts,
      jobLastError: j.lastError,
      jobUpdatedAt: j.updatedAt,
    })
    .from(p)
    .leftJoin(j, eq(j.prospectId, p.id))
    .leftJoin(contractors, eq(contractors.id, p.convertedToContractorId))
    .where(eq(p.id, id))
    .limit(1)
  if (!row) return null

  return {
    id: row.id,
    companyName: row.companyName,
    city: row.city,
    state: row.state,
    email: row.email,
    emailConfidence: row.emailConfidence,
    enrichmentStatus: row.enrichmentStatus,
    outreachStatus: row.outreachStatus,
    outreachCount: row.outreachCount,
    rating: row.rating,
    reviewCount: row.reviewCount,
    lastOutreachAt: row.lastOutreachAt,
    createdAt: row.createdAt,
    converted: row.convertedToContractorId != null,
    phone: row.phone,
    website: row.website,
    domain: row.domain,
    source: row.source,
    serviceId: row.serviceId,
    convertedAt: row.convertedAt,
    convertedContractor: row.contractorId
      ? { id: row.contractorId, companyName: row.contractorName }
      : null,
    job: row.jobStatus
      ? {
          status: row.jobStatus,
          attempts: row.jobAttempts ?? 0,
          lastError: row.jobLastError,
          updatedAt: row.jobUpdatedAt as Date,
        }
      : null,
  }
}

export type EnrichmentErrorRow = {
  prospectId: string
  companyName: string | null
  attempts: number
  lastError: string | null
  updatedAt: Date
}

/** Recent failed enrichment jobs — surfaces crawl problems to the admin. */
export async function getEnrichmentErrors(limit = 50, serviceId?: string): Promise<EnrichmentErrorRow[]> {
  const j = prospectEnrichmentJobs
  const p = contractorProspects
  return db
    .select({
      prospectId: j.prospectId,
      companyName: p.companyName,
      attempts: j.attempts,
      lastError: j.lastError,
      updatedAt: j.updatedAt,
    })
    .from(j)
    .innerJoin(p, eq(p.id, j.prospectId))
    .where(serviceId ? and(eq(j.status, 'error'), eq(p.serviceId, serviceId)) : eq(j.status, 'error'))
    .orderBy(desc(j.updatedAt))
    .limit(limit)
}
