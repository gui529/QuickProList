import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const REQUIRED = [
  'id',
  'addedAt',
  'tags',
  'severity',
  'subscriberImpact',
  'lesson',
  'evidence',
  'do',
  'dont',
  'status',
] as const

describe('campaign lessons.json', () => {
  it('parses and records the Yelp prospect-source ban', () => {
    const raw = JSON.parse(readFileSync('docs/campaigns/lessons.json', 'utf8')) as {
      version: number
      lessons: Array<Record<string, unknown>>
    }
    expect(raw.version).toBe(2)
    expect(Array.isArray(raw.lessons)).toBe(true)
    const ids = new Set<string>()
    for (const lesson of raw.lessons) {
      for (const key of REQUIRED) {
        const value = lesson[key]
        expect(value, String(lesson.id)).toBeTruthy()
      }
      expect(ids.has(String(lesson.id))).toBe(false)
      ids.add(String(lesson.id))
    }
    const yelp = raw.lessons.find((lesson) => lesson.id === '2026-10-17-no-yelp-prospect-source')
    expect(yelp?.addedAt).toBe('2026-10-17T18:00:00-04:00')
    expect(yelp?.status).toBe('active')
    expect(String(yelp?.lesson)).toMatch(/Yelp/)
    expect(String(yelp?.do)).toContain('docs/prospect-sources.md')
    expect(yelp?.tags).toEqual(['targeting'])
  })
})