import { describe, expect, it } from 'vitest'
import {
  isServedCountry,
  regionLabel,
  OPERATING_COUNTRIES,
  OPERATING_STATES,
} from '@/lib/config/service-areas'

describe('isServedCountry', () => {
  it('serves the operating countries (case-insensitive)', () => {
    expect(isServedCountry('US')).toBe(true)
    expect(isServedCountry('us')).toBe(true)
  })

  it('rejects non-operating or unknown countries', () => {
    expect(isServedCountry('PK')).toBe(false)
    expect(isServedCountry('CA')).toBe(false)
    expect(isServedCountry(null)).toBe(false)
    expect(isServedCountry(undefined)).toBe(false)
    expect(isServedCountry('')).toBe(false)
  })

  it('keeps OPERATING_COUNTRIES as the source of truth', () => {
    expect([...OPERATING_COUNTRIES]).toEqual(['US'])
  })
})

describe('regionLabel', () => {
  it('maps a known state code to its full name (case-insensitive)', () => {
    expect(regionLabel('TX')).toBe('Texas')
    expect(regionLabel('fl')).toBe('Florida')
  })

  it('returns null for unknown or missing regions', () => {
    expect(regionLabel('CA')).toBeNull()
    expect(regionLabel(null)).toBeNull()
    expect(regionLabel(undefined)).toBeNull()
    expect(regionLabel('')).toBeNull()
  })

  it('still exposes OPERATING_STATES for SEO pages', () => {
    expect([...OPERATING_STATES]).toEqual(['TX', 'FL'])
  })
})
