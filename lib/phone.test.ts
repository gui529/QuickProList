import { describe, expect, it } from 'vitest'
import { formatPhoneDisplay, phoneTelHref } from './phone'

describe('formatPhoneDisplay', () => {
  it('formats a raw 10-digit US number', () => {
    expect(formatPhoneDisplay('8436578901')).toBe('(843) 657-8901')
  })

  it('formats numbers that already include punctuation or a leading country code', () => {
    expect(formatPhoneDisplay('843-657-8901')).toBe('(843) 657-8901')
    expect(formatPhoneDisplay('(843) 657-8901')).toBe('(843) 657-8901')
    expect(formatPhoneDisplay('843.657.8901')).toBe('(843) 657-8901')
    expect(formatPhoneDisplay('1-843-657-8901')).toBe('(843) 657-8901')
    expect(formatPhoneDisplay('+1 (843) 657-8901')).toBe('(843) 657-8901')
    expect(formatPhoneDisplay('18436578901')).toBe('(843) 657-8901')
  })

  it('leaves values that are not a 10-digit US number unchanged', () => {
    expect(formatPhoneDisplay('555-0100')).toBe('555-0100')
    expect(formatPhoneDisplay('84365789012')).toBe('84365789012')
    expect(formatPhoneDisplay('+44 20 7946 0958')).toBe('+44 20 7946 0958')
    expect(formatPhoneDisplay('8436578901 x12')).toBe('8436578901 x12')
    expect(formatPhoneDisplay('')).toBe('')
  })
})

describe('phoneTelHref', () => {
  it('keeps recognized US numbers dialable with a leading +1', () => {
    expect(phoneTelHref('8436578901')).toBe('tel:+18436578901')
    expect(phoneTelHref('843-657-8901')).toBe('tel:+18436578901')
    expect(phoneTelHref('(843) 657-8901')).toBe('tel:+18436578901')
    expect(phoneTelHref('+1 (843) 657-8901')).toBe('tel:+18436578901')
  })

  it('does not invent a country code for other values', () => {
    expect(phoneTelHref('555-0100')).toBe('tel:555-0100')
    expect(phoneTelHref('+44 20 7946 0958')).toBe('tel:+44 20 7946 0958')
  })
})
