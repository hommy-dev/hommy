import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import {
  contractors,
  contractorServices,
  serviceAreas,
  services,
} from '@/lib/db/schema'
import { findEligibleContractors } from '@/lib/leads/matching'
import { getLeadPricing } from '@/lib/leads/pricing'

/**
 * Smoke test for the heart of the platform: GEOGRAPHIC (radius) lead matching.
 *
 * Proves a lead is offered to exactly the right companies — those that are
 * verified, offer the service, and whose coverage radius reaches the job — and
 * to nobody else. Runs against the throwaway docker Postgres (pnpm test:db:up).
 *
 *   Run:  pnpm test:db:up && pnpm test:integration
 */

// Dallas City Hall ≈ the seed contractor's turf. NYC is ~1,370 mi away.
const DALLAS = { lat: 32.7767, lng: -96.797 }
const NYC = { lat: 40.7128, lng: -74.006 }
// ~0.5° latitude ≈ 34.5 miles — just outside a 25mi radius, inside a 50mi one.
const HALF_DEGREE_NORTH = { lat: DALLAS.lat + 0.5, lng: DALLAS.lng }

async function seedRoofingService(): Promise<string> {
  const [s] = await db
    .insert(services)
    .values({ slug: 'roofing', name: 'Roofing', subtypes: ['Repair', 'Replacement'] })
    .returning({ id: services.id })
  return s.id
}

async function seedContractor(opts: {
  serviceId: string
  lat: number
  lng: number
  radiusMiles: number
  verified?: boolean
  profileScore?: number
  offersService?: boolean
}): Promise<string> {
  const [c] = await db
    .insert(contractors)
    .values({
      companyName: 'Test Roofing Co.',
      verificationStatus: opts.verified === false ? 'pending' : 'verified',
      profileScore: opts.profileScore ?? 50,
    })
    .returning({ id: contractors.id })

  if (opts.offersService !== false) {
    await db.insert(contractorServices).values({
      contractorId: c.id,
      serviceId: opts.serviceId,
      subtypes: ['Repair'],
    })
  }

  await db.insert(serviceAreas).values({
    contractorId: c.id,
    label: 'Coverage area',
    lat: opts.lat,
    lng: opts.lng,
    radiusMiles: opts.radiusMiles,
  })

  return c.id
}

describe('lead matching (radius)', () => {
  beforeAll(() => {
    if (!process.env.DATABASE_URL?.includes('localhost')) {
      throw new Error('Integration tests must point at the localhost test DB (.env.test).')
    }
  })

  // setup-integration.ts truncates all tables afterEach, but re-assert here so
  // this file is self-documenting about its clean-slate assumption.
  afterEach(async () => {})

  it('matches a verified contractor whose radius covers the job', async () => {
    const serviceId = await seedRoofingService()
    const id = await seedContractor({ serviceId, ...DALLAS, radiusMiles: 25 })

    // Job ~3.5mi from the contractor's centre — well inside 25mi.
    const eligible = await findEligibleContractors({
      serviceId,
      lat: DALLAS.lat + 0.05,
      lng: DALLAS.lng,
    })

    expect(eligible.map((e) => e.contractorId)).toContain(id)
  })

  it('does NOT match when the job is outside every radius', async () => {
    const serviceId = await seedRoofingService()
    await seedContractor({ serviceId, ...DALLAS, radiusMiles: 25 })

    const eligible = await findEligibleContractors({ serviceId, lat: NYC.lat, lng: NYC.lng })

    expect(eligible).toHaveLength(0)
  })

  it('honours each area’s own radius (34mi away: 25mi misses, 50mi hits)', async () => {
    const serviceId = await seedRoofingService()
    await seedContractor({ serviceId, ...HALF_DEGREE_NORTH, radiusMiles: 25 })

    // From Dallas, the 25mi contractor (34mi away) should NOT match.
    let eligible = await findEligibleContractors({ serviceId, ...DALLAS })
    expect(eligible).toHaveLength(0)

    // Add a contractor at the same spot but with a 50mi radius — now it reaches.
    const wide = await seedContractor({ serviceId, ...HALF_DEGREE_NORTH, radiusMiles: 50 })
    eligible = await findEligibleContractors({ serviceId, ...DALLAS })
    expect(eligible.map((e) => e.contractorId)).toContain(wide)
  })

  it('excludes unverified contractors', async () => {
    const serviceId = await seedRoofingService()
    await seedContractor({ serviceId, ...DALLAS, radiusMiles: 25, verified: false })

    const eligible = await findEligibleContractors({ serviceId, ...DALLAS })

    expect(eligible).toHaveLength(0)
  })

  it('excludes contractors that do not offer the service', async () => {
    const serviceId = await seedRoofingService()
    await seedContractor({ serviceId, ...DALLAS, radiusMiles: 25, offersService: false })

    const eligible = await findEligibleContractors({ serviceId, ...DALLAS })

    expect(eligible).toHaveLength(0)
  })

  it('ranks higher-score contractors first', async () => {
    const serviceId = await seedRoofingService()
    const low = await seedContractor({ serviceId, ...DALLAS, radiusMiles: 25, profileScore: 10 })
    const high = await seedContractor({ serviceId, ...DALLAS, radiusMiles: 25, profileScore: 90 })

    const eligible = await findEligibleContractors({ serviceId, ...DALLAS })
    const order = eligible.map((e) => e.contractorId)

    expect(order.indexOf(high)).toBeLessThan(order.indexOf(low))
  })

  it('prices roofing leads from config', () => {
    expect(getLeadPricing('roofing')).toEqual({
      engagementCreditCost: 2,
      awardCreditCost: 20,
      engageSlots: 3,
    })
  })
})
