import { describe, expect, it } from 'vitest'
import { AWARD_PRICING, computeAwardCost, getLeadPricing } from '@/lib/leads/pricing'

describe('getLeadPricing', () => {
  it('returns the roofing engagement cost', () => {
    expect(getLeadPricing('roofing')).toEqual({ engagementCreditCost: 1 })
  })

  it('falls back to the default for an unknown service', () => {
    expect(getLeadPricing('plumbing')).toEqual({ engagementCreditCost: 1 })
  })
})

describe('AWARD_PRICING policy constants', () => {
  it('is 2.5% with a [30, 290] credit clamp', () => {
    expect(AWARD_PRICING).toEqual({ pct: 0.025, minCredits: 30, maxCredits: 290 })
  })
})

describe('computeAwardCost', () => {
  it('charges 2.5% of the quote, crediting back engagement already paid', () => {
    // $9,000 → round(225) = 225, within [30,290], minus 1 engage = 224
    expect(computeAwardCost(9000, 1)).toBe(224)
  })

  it('applies the 30-credit floor for small quotes', () => {
    // $1,000 → round(25) = 25 → floored to 30, minus 1 = 29
    expect(computeAwardCost(1000, 1)).toBe(29)
  })

  it('applies the 290-credit cap for huge quotes', () => {
    // $1,000,000 → 25,000 → capped to 290, minus 1 = 289
    expect(computeAwardCost(1_000_000, 1)).toBe(289)
  })

  it('credits the full engagement amount when none was paid', () => {
    expect(computeAwardCost(9000, 0)).toBe(225)
  })

  it('never returns below zero even if engagement exceeds the fee', () => {
    expect(computeAwardCost(9000, 1000)).toBe(0)
  })

  it('treats zero / negative / non-finite totals as the floor', () => {
    expect(computeAwardCost(0, 1)).toBe(29) // floor 30 - 1
    expect(computeAwardCost(-500, 1)).toBe(29)
    expect(computeAwardCost(Number.NaN, 1)).toBe(29)
    expect(computeAwardCost(Infinity, 1)).toBe(29)
  })

  it('clamps a negative engagePaid to zero (no free money)', () => {
    expect(computeAwardCost(9000, -100)).toBe(225)
  })
})
