import { describe, expect, it } from 'vitest'
import { errorMessage } from './errors'

describe('errorMessage', () => {
  const fallback = 'Failed to save'

  it('returns the message from an Error instance', () => {
    expect(errorMessage(new Error('boom'), fallback)).toBe('boom')
  })

  it('returns the message from a PostgrestError-like plain object', () => {
    const err = {
      message: "Could not find the 'review_url' column of 'curated_businesses' in the schema cache",
      code: 'PGRST204',
      details: null,
      hint: null,
    }
    expect(errorMessage(err, fallback)).toBe(err.message)
  })

  it('returns a non-empty string message and falls back when the message is empty', () => {
    expect(errorMessage({ message: 'column missing' }, fallback)).toBe('column missing')
    expect(errorMessage({ message: '' }, fallback)).toBe(fallback)
  })

  it('returns the fallback for a non-string message', () => {
    expect(errorMessage({ message: 42 }, fallback)).toBe(fallback)
  })

  it('returns the fallback for a non-object', () => {
    expect(errorMessage('nope', fallback)).toBe(fallback)
    expect(errorMessage(1, fallback)).toBe(fallback)
    expect(errorMessage(undefined, fallback)).toBe(fallback)
  })

  it('returns the fallback for null', () => {
    expect(errorMessage(null, fallback)).toBe(fallback)
  })
})
