// Marketplace liquidity reads for /admin/liquidity — the north-star being: what
// % of posted jobs get a contractor ENGAGED, and how fast. The funnel is
// COHORT-based: a lead created in the window is counted once at each stage it
// reached (Posted → Matched → Engaged → Quoted → Won), so it never inflates from
// the lead→recipient fan-out. Fresh (no cache), like the rest of the admin layer.

import { db } from '@/lib/db'
import { sql, type SQL } from 'drizzle-orm'
import { leads, leadRecipients } from '@/lib/db/schema'
import { and, eq, gte, isNotNull } from 'drizzle-orm'

export type LiquidityOverview = {
  windowDays: number
  funnel: { posted: number; matched: number; engaged: number; quoted: number; won: number }
  kpis: {
    matchRate: number // engaged / posted (0–1) — north star
    fastMatchRate: number // posted engaged within 4h / posted
    winRate: number // won / posted
    awaiting: number // posted leads still awaiting coverage (no supply)
    avgResponseSeconds: number // avg time-to-first-engagement
  }
  timeseries: { date: string; label: string; posted: number; engaged: number }[]
  byCity: { city: string; state: string | null; posted: number; engaged: number }[]
}

/** Cohort funnel + KPIs + 30-day trend + per-city liquidity. */
export async function getLiquidityOverview(
  opts: { serviceId?: string; days?: number } = {},
): Promise<LiquidityOverview> {
  const days = opts.days ?? 30
  const sinceDays = sql.raw(String(Math.max(1, Math.floor(days))))
  const svc = opts.serviceId ? sql`and l.service_id = ${opts.serviceId}` : sql``

  // ── Cohort funnel + KPIs (one pass; per-lead booleans avoid fan-out inflation) ──
  const aggRows = (await db.execute(sql`
    with cohort as (
      select
        l.id,
        l.created_at,
        l.status,
        l.awaiting_coverage,
        exists(select 1 from lead_recipients r where r.lead_id = l.id) as matched,
        (select min(r.engaged_at) from lead_recipients r where r.lead_id = l.id) as first_engaged_at,
        exists(
          select 1 from projects p
          join estimates e on e.project_id = p.id
          where p.lead_id = l.id and e.sent_at is not null
        ) as quoted
      from leads l
      where l.created_at >= now() - make_interval(days => ${sinceDays}) ${svc}
    )
    select
      count(*)::int as posted,
      count(*) filter (where matched)::int as matched,
      count(*) filter (where first_engaged_at is not null)::int as engaged,
      count(*) filter (where quoted)::int as quoted,
      count(*) filter (where status = 'awarded')::int as won,
      count(*) filter (where first_engaged_at is not null and first_engaged_at <= created_at + interval '4 hours')::int as fast_engaged,
      count(*) filter (where awaiting_coverage)::int as awaiting,
      coalesce(avg(extract(epoch from (first_engaged_at - created_at))) filter (where first_engaged_at is not null), 0)::float as avg_ttf_seconds
    from cohort
  `)) as unknown as {
    posted: number; matched: number; engaged: number; quoted: number; won: number
    fast_engaged: number; awaiting: number; avg_ttf_seconds: number
  }[]
  const a = aggRows[0] ?? {
    posted: 0, matched: 0, engaged: 0, quoted: 0, won: 0, fast_engaged: 0, awaiting: 0, avg_ttf_seconds: 0,
  }

  // ── 30-day trend: posted/day (lead cohort) + engaged/day (distinct leads) ──
  const since = sql`now() - interval '29 days'`
  const scopeLeads = (extra?: SQL) => and(gte(leads.createdAt, since), opts.serviceId ? eq(leads.serviceId, opts.serviceId) : undefined, extra)

  const postedByDay = await db
    .select({
      d: sql<string>`to_char(date_trunc('day', ${leads.createdAt}), 'YYYY-MM-DD')`,
      c: sql<number>`count(*)::int`,
    })
    .from(leads)
    .where(scopeLeads())
    .groupBy(sql`1`)

  const engagedByDay = await db
    .select({
      d: sql<string>`to_char(date_trunc('day', ${leadRecipients.engagedAt}), 'YYYY-MM-DD')`,
      c: sql<number>`count(distinct ${leadRecipients.leadId})::int`,
    })
    .from(leadRecipients)
    .innerJoin(leads, eq(leads.id, leadRecipients.leadId))
    .where(
      and(
        isNotNull(leadRecipients.engagedAt),
        gte(leadRecipients.engagedAt, since),
        opts.serviceId ? eq(leads.serviceId, opts.serviceId) : undefined,
      ),
    )
    .groupBy(sql`1`)

  const postedMap = new Map(postedByDay.map((r) => [r.d, r.c]))
  const engagedMap = new Map(engagedByDay.map((r) => [r.d, r.c]))
  const timeseries: LiquidityOverview['timeseries'] = []
  const labelFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(now)
    dt.setUTCDate(now.getUTCDate() - i)
    const date = dt.toISOString().slice(0, 10)
    timeseries.push({
      date,
      label: labelFmt.format(dt),
      posted: postedMap.get(date) ?? 0,
      engaged: engagedMap.get(date) ?? 0,
    })
  }

  // ── Per-city liquidity (posted + engaged), busiest first ──
  const cityRows = (await db.execute(sql`
    select
      l.city as city,
      l.state as state,
      count(distinct l.id)::int as posted,
      count(distinct l.id) filter (
        where exists(select 1 from lead_recipients r where r.lead_id = l.id and r.engaged_at is not null)
      )::int as engaged
    from leads l
    where l.created_at >= now() - make_interval(days => ${sinceDays}) and l.city is not null ${svc}
    group by l.city, l.state
    order by posted desc
    limit 20
  `)) as unknown as { city: string; state: string | null; posted: number; engaged: number }[]

  return {
    windowDays: days,
    funnel: { posted: a.posted, matched: a.matched, engaged: a.engaged, quoted: a.quoted, won: a.won },
    kpis: {
      matchRate: a.posted ? a.engaged / a.posted : 0,
      fastMatchRate: a.posted ? a.fast_engaged / a.posted : 0,
      winRate: a.posted ? a.won / a.posted : 0,
      awaiting: a.awaiting,
      avgResponseSeconds: a.avg_ttf_seconds,
    },
    timeseries,
    byCity: cityRows.map((r) => ({ city: r.city, state: r.state, posted: r.posted, engaged: r.engaged })),
  }
}
