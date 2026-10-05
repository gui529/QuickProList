const MAX_RAW_LENGTH = 200

/**
 * Turns the `error` value that Auth.js and `/admin` put on the `/login` URL
 * into something an admin can act on. Unknown values are shown as-is,
 * truncated.
 */
export function loginErrorMessage(code: string | null | undefined): string | null {
  const raw = code?.trim()
  if (!raw) return null

  if (raw === 'not_an_admin') {
    return 'That Google account is not on the admin list. Sign in with an admin Google account.'
  }
  if (raw === 'AccessDenied') {
    return 'Google sign-in was not approved. Try again with a verified Google account.'
  }
  if (raw === 'Configuration') {
    return 'Google sign-in is not configured on this site yet.'
  }

  const trimmed = raw.length > MAX_RAW_LENGTH ? `${raw.slice(0, MAX_RAW_LENGTH)}…` : raw
  return `Sign-in failed: ${trimmed}`
}
