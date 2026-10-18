const REMINDER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const REMINDER_EMAIL_REQUIRED_ERROR = 'Enter an email for preview reminders.'
export const REMINDER_EMAIL_INVALID_ERROR = 'Enter a valid email for preview reminders.'

/** Null when the value is a usable reminder address. */
export function reminderEmailError(value: string | null | undefined): string | null {
  const email = value?.trim() ?? ''
  if (!email) return REMINDER_EMAIL_REQUIRED_ERROR
  if (!REMINDER_EMAIL_RE.test(email)) return REMINDER_EMAIL_INVALID_ERROR
  return null
}
