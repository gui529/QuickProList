const REMINDER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const REMINDER_EMAIL_REQUIRED_ERROR = 'Enter an email for preview reminders.'
export const REMINDER_EMAIL_INVALID_ERROR = 'Enter a valid email for preview reminders.'

/**
 * A hint that does not reveal the full address. Null when there is nothing to hint.
 * The enroll form stays blank either way — the link itself is not proof of the inbox.
 */
export function maskEmailHint(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase() ?? ''
  const at = trimmed.lastIndexOf('@')
  if (at <= 0 || at === trimmed.length - 1) return null
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  if (local.includes(' ') || !domain.includes('.') || domain.includes(' ')) return null
  return `${local.slice(0, 1)}***@${domain}`
}

/** Null when the value is a usable reminder address. */
export function reminderEmailError(value: string | null | undefined): string | null {
  const email = value?.trim() ?? ''
  if (!email) return REMINDER_EMAIL_REQUIRED_ERROR
  if (!REMINDER_EMAIL_RE.test(email)) return REMINDER_EMAIL_INVALID_ERROR
  return null
}
