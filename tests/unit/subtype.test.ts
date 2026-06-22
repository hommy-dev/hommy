import { describe, expect, it } from 'vitest'
import { leadPhotos, subtypeLabel, subtypeList } from '@/lib/leads/subtype'

describe('subtypeList', () => {
  it('reads the current array shape, keeping only strings', () => {
    expect(subtypeList({ subtypes: ['Repair', 'Replacement'] })).toEqual(['Repair', 'Replacement'])
    expect(subtypeList({ subtypes: ['Repair', 42, null] })).toEqual(['Repair'])
  })

  it('falls back to the legacy single subtype', () => {
    expect(subtypeList({ subtype: 'Storm damage' })).toEqual(['Storm damage'])
  })

  it('returns [] for missing / empty / nullish details', () => {
    expect(subtypeList({})).toEqual([])
    expect(subtypeList(null)).toEqual([])
    expect(subtypeList(undefined)).toEqual([])
  })
})

describe('subtypeLabel', () => {
  it('comma-joins multiple subtypes', () => {
    expect(subtypeLabel({ subtypes: ['Repair', 'Replacement'] })).toBe('Repair, Replacement')
  })

  it('returns null when there are none', () => {
    expect(subtypeLabel({})).toBeNull()
    expect(subtypeLabel(null)).toBeNull()
  })
})

describe('leadPhotos', () => {
  it('returns the string photos array, or [] when absent', () => {
    expect(leadPhotos({ photos: ['a.jpg', 'b.jpg'] })).toEqual(['a.jpg', 'b.jpg'])
    expect(leadPhotos({ photos: ['a.jpg', 5] })).toEqual(['a.jpg'])
    expect(leadPhotos({})).toEqual([])
    expect(leadPhotos(null)).toEqual([])
  })
})
