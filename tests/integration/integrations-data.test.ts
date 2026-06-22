import { beforeAll, describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { db } from '@/lib/db'
import {
  externalMedia,
  externalReviews,
  integrationConnections,
  reviews,
} from '@/lib/db/schema'
import {
  getCombinedReviews,
  getContractorConnections,
  getExternalReviews,
} from '@/lib/data/integrations'
import {
  makeContact,
  makeContractor,
  makeHomeowner,
  makeLead,
  makeProject,
  seedRoofingService,
} from '../fixtures'

/**
 * The integrations read layer (Google Places import). These are plain DB reads —
 * no auth, cache, or network — so no mocks: seed native + external rows and
 * assert the merge math, the per-source counts, and the unified card mapping.
 */

async function makeConnection(contractorId: string): Promise<string> {
  const [c] = await db
    .insert(integrationConnections)
    .values({
      contractorId,
      provider: 'google_places',
      externalAccountId: `place-${randomBytes(4).toString('hex')}`,
      externalAccountLabel: 'Acme Roofing on Google',
    })
    .returning({ id: integrationConnections.id })
  return c.id
}

async function addExternalReview(
  connectionId: string,
  contractorId: string,
  rating: number,
  overrides: Partial<typeof externalReviews.$inferInsert> = {},
): Promise<void> {
  await db.insert(externalReviews).values({
    connectionId,
    contractorId,
    provider: 'google_places',
    externalId: `rev-${randomBytes(6).toString('hex')}`,
    rating,
    comment: 'Solid work',
    authorName: 'Jane G.',
    authorPhotoUrl: 'https://example.com/jane.jpg',
    sourceUrl: 'https://maps.google.com/review/123',
    postedAt: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  })
}

/** A submitted native (Hommy) review for the contractor. */
async function addNativeReview(contractorId: string, serviceId: string, rating: number): Promise<void> {
  const ho = await makeHomeowner()
  const contactId = await makeContact(contractorId, ho.homeownerId)
  const lead = await makeLead(ho.homeownerId, serviceId, { lat: null, lng: null })
  const projectId = await makeProject(contractorId, contactId, serviceId, { leadId: lead })
  await db.insert(reviews).values({
    projectId,
    contractorId,
    reviewerType: 'homeowner',
    reviewerId: ho.homeownerId,
    rating,
    comment: 'Great',
    token: randomBytes(24).toString('base64url'),
    submittedAt: new Date('2026-06-10T00:00:00Z'),
  })
}

describe('integrations data', () => {
  beforeAll(() => {
    if (!process.env.DATABASE_URL?.includes('localhost')) {
      throw new Error('Integration tests must point at the localhost test DB (.env.test).')
    }
  })

  it('getExternalReviews maps imported rows to the unified card shape (source google)', async () => {
    const serviceId = await seedRoofingService()
    const contractorId = await makeContractor()
    const conn = await makeConnection(contractorId)
    await addExternalReview(conn, contractorId, 5)

    const out = await getExternalReviews(contractorId)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      rating: 5,
      reviewerName: 'Jane G.',
      source: 'google',
      authorPhotoUrl: 'https://example.com/jane.jpg',
      sourceUrl: 'https://maps.google.com/review/123',
    })
    void serviceId
  })

  it('hides reviews flagged not-visible', async () => {
    const contractorId = await makeContractor()
    const conn = await makeConnection(contractorId)
    await addExternalReview(conn, contractorId, 4, { isVisible: false })
    expect(await getExternalReviews(contractorId)).toHaveLength(0)
  })

  it('getContractorConnections counts reviews and photos per connection (groupBy path)', async () => {
    const contractorId = await makeContractor()
    const conn = await makeConnection(contractorId)
    await addExternalReview(conn, contractorId, 5)
    await addExternalReview(conn, contractorId, 4)
    await db.insert(externalMedia).values({
      connectionId: conn,
      contractorId,
      provider: 'google_places',
      externalId: `media-${randomBytes(4).toString('hex')}`,
      sourceUrl: 'https://example.com/photo.jpg',
    })

    const rows = await getContractorConnections(contractorId)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ provider: 'google_places', reviewCount: 2, mediaCount: 1 })
  })

  it('returns no connections for a company that has not connected anything', async () => {
    const contractorId = await makeContractor()
    expect(await getContractorConnections(contractorId)).toEqual([])
  })

  it('getCombinedReviews merges native + Google into a true weighted mean with per-source counts', async () => {
    const serviceId = await seedRoofingService()
    const contractorId = await makeContractor()
    const conn = await makeConnection(contractorId)
    // Native: one 4★. Google: 5★ and 2★. Combined mean = (4+5+2)/3 = 3.6667.
    await addNativeReview(contractorId, serviceId, 4)
    await addExternalReview(conn, contractorId, 5)
    await addExternalReview(conn, contractorId, 2)

    const combined = await getCombinedReviews(contractorId)
    expect(combined.total).toBe(3)
    expect(combined.hommyCount).toBe(1)
    expect(combined.googleCount).toBe(2)
    expect(combined.avgRating).toBeCloseTo(11 / 3, 5)
    expect(combined.distribution).toMatchObject({ 2: 1, 4: 1, 5: 1 })
    expect(combined.reviews).toHaveLength(3)
  })

  it('reports a null average when there are no reviews at all', async () => {
    const contractorId = await makeContractor()
    const combined = await getCombinedReviews(contractorId)
    expect(combined).toMatchObject({ avgRating: null, total: 0, hommyCount: 0, googleCount: 0 })
  })
})
