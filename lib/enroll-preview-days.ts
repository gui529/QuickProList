/** Default preview length. Matches the approved "30 days" wording when env is unset. */
export const DEFAULT_ENROLL_PREVIEW_TRIAL_DAYS = 30

/**
 * Positive whole days from ENROLL_PREVIEW_TRIAL_DAYS.
 * Blank, zero, decimals, and other junk fall back to 30. This does not invent a length.
 */
export function parseEnrollPreviewTrialDays(raw: string | null | undefined): number {
  const trimmed = raw?.trim() ?? ''
  if (!/^[1-9]\d*$/.test(trimmed)) return DEFAULT_ENROLL_PREVIEW_TRIAL_DAYS
  const days = Number(trimmed)
  if (!Number.isSafeInteger(days) || days <= 0) return DEFAULT_ENROLL_PREVIEW_TRIAL_DAYS
  return days
}

export function enrollPreviewTrialDays(): number {
  return parseEnrollPreviewTrialDays(process.env.ENROLL_PREVIEW_TRIAL_DAYS)
}
