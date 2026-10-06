/**
 * Display-only formatting for US phone numbers. Stored values are not changed.
 *
 * A 10-digit number, or an 11-digit number with a leading country code 1,
 * displays as `(843) 657-8901`. Spaces and common punctuation are ignored
 * when counting digits. Anything else is returned unchanged.
 */

const SEPARATORS = /[\s().+-]/g

function usNationalDigits(raw: string): string | null {
  const compact = raw.trim().replace(SEPARATORS, '')
  if (/^\d{10}$/.test(compact)) return compact
  if (/^1\d{10}$/.test(compact)) return compact.slice(1)
  return null
}

export function formatPhoneDisplay(raw: string): string {
  const national = usNationalDigits(raw)
  if (!national) return raw
  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
}

/** Dialable `tel:` href. Recognized US numbers use digits with a leading +1. */
export function phoneTelHref(raw: string): string {
  const national = usNationalDigits(raw)
  if (national) return `tel:+1${national}`
  return `tel:${raw.trim()}`
}
