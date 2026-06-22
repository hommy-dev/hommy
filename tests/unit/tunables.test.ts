import { describe, expect, it } from 'vitest'
import {
  FAST_ENGAGE_FRACTION,
  quoteReminderHours,
  responseWindowHours,
  reviewScoreDelta,
  SCORE_DELTAS,
} from '@/lib/config/tunables'

describe('reviewScoreDelta', () => {
  it('maps stars to ±, centred on 3★ = 0', () => {
    expect(reviewScoreDelta(1)).toBe(-8)
    expect(reviewScoreDelta(2)).toBe(-4)
    expect(reviewScoreDelta(3)).toBe(0)
    expect(reviewScoreDelta(4)).toBe(4)
    expect(reviewScoreDelta(5)).toBe(8)
  })

  it('clamps out-of-range ratings', () => {
    expect(reviewScoreDelta(0)).toBe(-8) // clamps to 1
    expect(reviewScoreDelta(9)).toBe(8) // clamps to 5
  })
})

describe('SCORE_DELTAS (regression lock)', () => {
  it('matches the documented carrots-over-sticks values', () => {
    expect(SCORE_DELTAS).toEqual({
      engagement: 3,
      fast_engagement: 5,
      quote_accepted: 15,
      review_received: 0,
      decline_with_reason: 0,
      decline_no_reason: -3,
      off_platform_flag: -25,
    })
  })
})

describe('urgency windows', () => {
  it('responseWindowHours per urgency, defaulting to within_month', () => {
    expect(responseWindowHours('emergency')).toBe(4)
    expect(responseWindowHours('within_week')).toBe(24)
    expect(responseWindowHours('within_month')).toBe(48)
    expect(responseWindowHours('planning')).toBe(72)
    expect(responseWindowHours('nonsense')).toBe(48)
  })

  it('quoteReminderHours per urgency, defaulting to within_month', () => {
    expect(quoteReminderHours('emergency')).toBe(24)
    expect(quoteReminderHours('within_week')).toBe(72)
    expect(quoteReminderHours('within_month')).toBe(120)
    expect(quoteReminderHours('planning')).toBe(168)
    expect(quoteReminderHours('nonsense')).toBe(120)
  })

  it('keeps the fast-engage fraction at a quarter of the window', () => {
    expect(FAST_ENGAGE_FRACTION).toBe(0.25)
  })
})
