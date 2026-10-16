/**
 * Read-only SQL for campaign-manager via Neon MCP (cloud automation).
 * Do not use with DATABASE_URL scripts unless copied intentionally.
 */

export const SQL_PAYING_SUBSCRIBER_COUNT = `
SELECT COUNT(*)::int AS paying_subscribers
FROM enrollment_invitations
WHERE status = 'paid';
`.trim()

export const SQL_LISTED_CURATED_PROSPECTS = `
SELECT id, name, category, cities, contact_email, website_url
FROM curated_businesses
WHERE is_draft = false AND delisted_at IS NULL
ORDER BY category, name;
`.trim()

/** Parameter: normalized email (lowercase, trimmed). Safe for literal substitution in MCP. */
export function sqlEmailSuppressedCheck(normalizedEmail: string): string {
  const safe = normalizedEmail.replace(/'/g, "''")
  return `
SELECT 1 AS suppressed
FROM suppressions
WHERE channel = 'email' AND value = '${safe}'
LIMIT 1;
`.trim()
}
