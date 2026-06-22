import { describe, expect, it } from 'vitest'
import {
  isServedCity,
  isServedLocation,
  isServedRegion,
  OPERATING_CITIES,
  OPERATING_STATES,
} from '@/lib/config/service-areas'

describe('isServedRegion', () => {
  it('serves the operating states (case-insensitive)', () => {
    expect(isServedRegion('TX')).toBe(true)
    expect(isServedRegion('fl')).toBe(true)
    expect(isServedRegion('TX', 'US')).toBe(true)
  })

  it('rejects non-operating or unknown regions', () => {
    expect(isServedRegion('CA')).toBe(false)
    expect(isServedRegion(null)).toBe(false)
    expect(isServedRegion(undefined)).toBe(false)
    expect(isServedRegion('')).toBe(false)
  })

  it('rejects a served state code in a non-US country', () => {
    expect(isServedRegion('TX', 'CA')).toBe(false)
  })

  it('keeps OPERATING_STATES as the source of truth', () => {
    expect([...OPERATING_STATES]).toEqual(['TX', 'FL'])
  })
})

describe('isServedCity', () => {
  it('serves Bahawalnagar, PK (case- and space-insensitive)', () => {
    expect(isServedCity('Bahawalnagar', 'PK')).toBe(true)
    expect(isServedCity('  bahawalnagar ', 'pk')).toBe(true)
  })

  it('requires the matching country', () => {
    expect(isServedCity('Bahawalnagar', 'US')).toBe(false)
    expect(isServedCity('Bahawalnagar')).toBe(false) // no country → no match
  })

  it('rejects other cities and empties', () => {
    expect(isServedCity('Lahore', 'PK')).toBe(false)
    expect(isServedCity(null, 'PK')).toBe(false)
  })

  it('exposes Bahawalnagar in OPERATING_CITIES', () => {
    expect(OPERATING_CITIES).toContainEqual({ country: 'PK', city: 'Bahawalnagar' })
  })
})

describe('isServedLocation', () => {
  it('is true when EITHER the region or the city is served', () => {
    expect(isServedLocation('TX', 'US', 'Austin')).toBe(true) // region
    expect(isServedLocation('PB', 'PK', 'Bahawalnagar')).toBe(true) // city
  })

  it('is false when neither matches', () => {
    expect(isServedLocation('PB', 'PK', 'Lahore')).toBe(false)
    expect(isServedLocation(null, null, null)).toBe(false)
  })
})
