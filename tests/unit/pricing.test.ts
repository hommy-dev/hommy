import { describe, expect, it } from 'vitest'
import { AWARD_PRICING, computeAwardCost, getLeadPricing } from '@/lib/leads/pricing'

describe('getLeadPricing', () => {
  it('returns the roofing engagement cost', () => {
    expect(getLeadPricing('roofing')).toEqual({ engagementCreditCost: 5 })
  })

  it('falls back to the default for an unknown service', () => {
    expect(getLeadPricing('plumbing')).toEqual({ engagementCreditCost: 5 })
  })
})

describe('AWARD_PRICING policy constants', () => {
  it('is 2.5% with a [40, 250] credit clamp', () => {
    expect(AWARD_PRICING).toEqual({ pct: 0.025, minCredits: 40, maxCredits: 250 })
  })
})

describe('computeAwardCost', () => {
  it('charges 2.5% of the quote, crediting back engagement already paid', () => {
    // $9,000 → round(225) = 225, within [40,250], minus 5 engage = 220
    expect(computeAwardCost(9000, 5)).toBe(220)
  })

  it('applies the 40-credit floor for small quotes', () => {
    // $1,000 → round(25) = 25 → floored to 40, minus 5 = 35
    expect(computeAwardCost(1000, 5)).toBe(35)
  })

  it('applies the 250-credit cap for huge quotes', () => {
    // $1,000,000 → 25,000 → capped to 250, minus 5 = 245
    expect(computeAwardCost(1_000_000, 5)).toBe(245)
  })

  it('credits the full engagement amount when none was paid', () => {
    expect(computeAwardCost(9000, 0)).toBe(225)
  })

  it('never returns below zero even if engagement exceeds the fee', () => {
    expect(computeAwardCost(9000, 1000)).toBe(0)
  })

  it('treats zero / negative / non-finite totals as the floor', () => {
    expect(computeAwardCost(0, 5)).toBe(35) // floor 40 - 5
    expect(computeAwardCost(-500, 5)).toBe(35)
    expect(computeAwardCost(Number.NaN, 5)).toBe(35)
    expect(computeAwardCost(Infinity, 5)).toBe(35)
  })

  it('clamps a negative engagePaid to zero (no free money)', () => {
    expect(computeAwardCost(9000, -100)).toBe(225)
  })
})
