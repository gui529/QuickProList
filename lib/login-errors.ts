const MAX_RAW_LENGTH = 200

/**
 * Turns the `error` value that `/auth/callback` and `/admin` put on the
 * `/login` URL into something an admin can act on. Unknown values (for
 * example a raw Supabase message) are shown as-is, truncated.
 */
export function loginErrorMessage(code: string | null | undefined): string | null {
  const raw = code?.trim()
  if (!raw) return null

  if (raw === 'not_an_admin') {
    return 'That email is not on the admin list. Sign in with an admin email address.'
  }
  if (raw === 'missing_code') {
    return 'The sign-in link was incomplete. Request a new magic link below.'
  }

  const lower = raw.toLowerCase()
  if (lower.includes('code verifier') || lower.includes('code_verifier')) {
    return 'Open the magic link in the same browser where you requested it, or request a new one below.'
  }
  if (lower === 'otp_expired' || lower.includes('expired') || lower.includes('invalid')) {
    return 'That sign-in link is invalid or has expired. Request a new magic link below.'
  }

  const trimmed = raw.length > MAX_RAW_LENGTH ? `${raw.slice(0, MAX_RAW_LENGTH)}…` : raw
  return `Sign-in failed: ${trimmed}`
}
