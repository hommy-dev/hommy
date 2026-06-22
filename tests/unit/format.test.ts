import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, formatDistanceToNow } from '@/lib/format'
import { formatUnreadBadge } from '@/utils/format/unread'
import { scoreStanding } from '@/lib/reputation/labels'

describe('formatCurrency', () => {
  it('formats numbers and decimal strings as USD', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00')
    expect(formatCurrency('2500.5')).toBe('$2,500.50')
  })
})

describe('formatDate', () => {
  it('renders a medium date and dashes nullish', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate(new Date('2026-01-15T00:00:00Z'))).toMatch(/Jan/)
  })
})

describe('formatDistanceToNow', () => {
  it('uses relative buckets for recent times', () => {
    expect(formatDistanceToNow(new Date(Date.now() - 30 * 1000))).toBe('just now')
    expect(formatDistanceToNow(new Date(Date.now() - 5 * 60 * 1000))).toBe('5m ago')
    expect(formatDistanceToNow(new Date(Date.now() - 3 * 60 * 60 * 1000))).toBe('3h ago')
    expect(formatDistanceToNow(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))).toBe('2d ago')
  })
})

describe('formatUnreadBadge', () => {
  it('hides zero, shows exact up to 99, then 99+', () => {
    expect(formatUnreadBadge(0)).toBe('')
    expect(formatUnreadBadge(-3)).toBe('')
    expect(formatUnreadBadge(7)).toBe('7')
    expect(formatUnreadBadge(99)).toBe('99')
    expect(formatUnreadBadge(100)).toBe('99+')
  })
})

describe('scoreStanding', () => {
  it('labels by threshold', () => {
    expect(scoreStanding(0).label).toBe('Just getting started')
    expect(scoreStanding(19).label).toBe('Building')
    expect(scoreStanding(49).label).toBe('Established')
    expect(scoreStanding(50).label).toBe('Strong')
  })
})
