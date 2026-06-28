// Recruitment discovery driver. Two triggers:
//   • lead/awaiting-coverage {leadId} — organic: a homeowner posted into an empty
//     area; discover roofers near that point.
//   • recruitment/discover {serviceId, serviceSlug, lat, lng, city, state} —
//     admin city campaign (startCampaign action).
// Debounced per (service, city, state): if we already have prospects there, we
// don't re-scan on every new awaiting lead.

import { and, eq, sql } from 'drizzle-orm'
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { contractorProspects, leads, services } from '@/lib/db/schema'
import { discoverProspectsNear, type DiscoverArgs } from '@/lib/recruitment/discovery'

async function alreadyDiscovered(serviceId: string, city: string | null, state: string | null): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(contractorProspects)
    .where(
      and(
        eq(contractorProspects.serviceId, serviceId),
        city ? eq(contractorProspects.city, city) : sql`city is null`,
        state ? eq(contractorProspects.state, state) : sql`state is null`,
      ),
    )
  return (row?.n ?? 0) > 0
}

export const recruitmentDiscover = inngest.createFunction(
  {
    id: 'recruitment-discover',
    name: 'Discover contractor prospects for an uncovered area',
    triggers: [
      { event: INNGEST_EVENTS.LEAD_AWAITING_COVERAGE },
      { event: INNGEST_EVENTS.RECRUITMENT_DISCOVER },
    ],
    // Don't hammer Places: one discovery at a time.
    concurrency: { limit: 2 },
    retries: 2,
  },
  async ({ event, step }) => {
    const args = await step.run('resolve-target', async (): Promise<DiscoverArgs | null> => {
      if (event.name === INNGEST_EVENTS.LEAD_AWAITING_COVERAGE) {
        const leadId = event.data.leadId as string | undefined
        if (!leadId) return null
        const [lead] = await db
          .select({
            serviceId: leads.serviceId,
            serviceSlug: services.slug,
            lat: leads.lat,
            lng: leads.lng,
            city: leads.city,
            state: leads.state,
            awaiting: leads.awaitingCoverage,
          })
          .from(leads)
          .innerJoin(services, eq(services.id, leads.serviceId))
          .where(eq(leads.id, leadId))
          .limit(1)
        // Skip if it got covered in the meantime, or has no coordinates.
        if (!lead || !lead.awaiting || lead.lat == null || lead.lng == null) return null
        return {
          serviceId: lead.serviceId,
          serviceSlug: lead.serviceSlug,
          lat: lead.lat,
          lng: lead.lng,
          city: lead.city,
          state: lead.state,
        }
      }
      // Admin campaign event carries the target directly.
      const d = event.data as Partial<DiscoverArgs>
      if (!d.serviceId || d.lat == null || d.lng == null) return null
      return {
        serviceId: d.serviceId,
        serviceSlug: d.serviceSlug ?? null,
        lat: d.lat,
        lng: d.lng,
        city: d.city ?? null,
        state: d.state ?? null,
      }
    })

    if (!args) return { ok: false, reason: 'no target' }

    // Debounce organic re-scans (admin campaigns always run).
    if (event.name === INNGEST_EVENTS.LEAD_AWAITING_COVERAGE) {
      const seen = await step.run('debounce', () =>
        alreadyDiscovered(args.serviceId, args.city, args.state),
      )
      if (seen) return { ok: true, skipped: 'already discovered this area' }
    }

    const result = await step.run('discover', () => discoverProspectsNear(args))
    return { ok: true, ...result }
  },
)
